<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

function ims_user(Request $r) {
 $raw = $r->bearerToken(); if (!$raw) abort(401,'Authentication required.');
 $token = DB::table('personal_access_tokens')->where('token_hash',hash('sha256',$raw))->where('expires_at','>',now())->first();
 if (!$token) abort(401,'Session expired. Please log in again.');
 $u=DB::table('users')->where('id',$token->user_id)->where('active',1)->first(); if(!$u) abort(401,'Account inactive.');
 return $u;
}
function ims_auth(Request $r) { $u=ims_user($r); app()->instance('ims.user',$u); return $u; }
function ims_need($u,$perm) {
 $allowed=['Admin'=>['items','stock','alerts','settings','reports','users','purchasing','po_approve'],'Warehouse Staff'=>['stock','alerts','reports','purchasing'],'Viewer'=>['reports']];
 if(!in_array($perm,$allowed[$u->role]??[],true)) abort(403,'Insufficient permissions.');
}
function ims_audit($u,$action,$type,$id,$details=[]) { DB::table('audit_log')->insert(['actor_id'=>$u->id,'action'=>$action,'entity_type'=>$type,'entity_id'=>(string)$id,'details'=>json_encode($details),'created_at'=>now(),'updated_at'=>now()]); }
function ims_item($item) { $on=DB::table('batches')->where('item_id',$item->id)->where(function($q){$q->whereNull('expiry_date')->orWhereDate('expiry_date','>=',today());})->sum('qty_remaining'); return array_merge((array)$item,['qty_on_hand'=>(int)$on,'stock_status'=>$on<=0?'out_of_stock':($on<=$item->reorder_point?'below_reorder':'healthy')]); }
function ims_perms($role) {
 $map = [
  'Admin' => ['items:write','stock:write','alerts:resolve','settings:write','reports:read','purchasing:write','purchasing:approve'],
  'Warehouse Staff' => ['stock:write','alerts:resolve','reports:read','purchasing:write'],
  'Viewer' => ['reports:read'],
 ];
 return $map[$role] ?? [];
}
function ims_warranty($row) {
 $row->warranty_days_left = null;
 if (!$row->warranty_end) {
  $row->warranty_status = $row->status === 'sold' ? 'no_warranty' : 'not_started';
  return $row;
 }
 $left = (int) floor((strtotime($row->warranty_end) - strtotime(today()->toDateString())) / 86400);
 $row->warranty_days_left = $left;
 $row->warranty_status = $left < 0 ? 'expired' : ($left <= 30 ? 'expiring_soon' : 'active');
 return $row;
}
function ims_serial_row($id) {
 $row = DB::table('item_serials as s')->join('items as i','i.id','=','s.item_id')->leftJoin('batches as b','b.id','=','s.batch_id')
  ->where('s.id',$id)->select('s.*','i.sku_id','i.name as item_name','i.warranty_months','b.lot_id')->first();
 return $row ? ims_warranty($row) : null;
}
// stock effect (units) of moving a serial between statuses; null = not allowed
function ims_serial_stock_delta($from, $to) {
 $map = ['in_stock>sold'=>-1,'returned>sold'=>-1,'sold>returned'=>1,'in_stock>defective'=>-1,'returned>defective'=>-1,'sold>defective'=>0];
 return $map[$from.'>'.$to] ?? null;
}
function ims_po_number() {
 $prefix = 'PO-'.date('Y').'-';
 $n = DB::table('purchase_orders')->where('po_number','like',$prefix.'%')->count() + 1;
 while (DB::table('purchase_orders')->where('po_number',$prefix.str_pad((string)$n,4,'0',STR_PAD_LEFT))->exists()) $n++;
 return $prefix.str_pad((string)$n,4,'0',STR_PAD_LEFT);
}
function ims_po($id) {
 $po = DB::table('purchase_orders as p')->join('suppliers as s','s.id','=','p.supplier_id')
  ->leftJoin('users as c','c.id','=','p.created_by')->leftJoin('users as a','a.id','=','p.approved_by')
  ->where('p.id',$id)->select('p.*','s.name as supplier_name','c.name as created_by_name','a.name as approved_by_name')->first();
 if (!$po) abort(404,'Purchase order not found.');
 return $po;
}
function ims_po_lines($id) {
 return DB::table('purchase_order_lines as l')->join('items as i','i.id','=','l.item_id')->where('l.purchase_order_id',$id)
  ->select('l.*','i.sku_id','i.name as item_name','i.shelf_life_days')->orderBy('l.id')->get();
}
Route::get('/health',fn()=>['status'=>'ok']);
Route::post('/auth/login',function(Request $r){
 $d=$r->validate(['username'=>'required|string','password'=>'required|string']); $u=DB::table('users')->where('username',$d['username'])->where('active',1)->first();
 if(!$u||!Hash::check($d['password'],$u->password)){DB::table('audit_log')->insert(['actor_id'=>null,'action'=>'login_failed','entity_type'=>'user','entity_id'=>substr($d['username'],0,200),'details'=>json_encode(['ip'=>$r->ip()]),'created_at'=>now(),'updated_at'=>now()]);return response()->json(['error'=>'Invalid username or password.'],401);}
 $raw=Str::random(64); DB::table('personal_access_tokens')->insert(['user_id'=>$u->id,'token_hash'=>hash('sha256',$raw),'expires_at'=>now()->addHours(8),'created_at'=>now(),'updated_at'=>now()]);
 ims_audit($u,'login','user',$u->id); return ['token'=>$raw,'user'=>['id'=>$u->id,'username'=>$u->username,'name'=>$u->name,'role'=>$u->role,'permissions'=>ims_perms($u->role)]];
})->middleware('throttle:10,1');
Route::middleware('api')->group(function(){
 Route::get('/auth/me',function(Request $r){$u=ims_auth($r);return ['user'=>['id'=>$u->id,'username'=>$u->username,'name'=>$u->name,'role'=>$u->role,'permissions'=>ims_perms($u->role)]];});
 Route::get('/items',function(Request $r){ims_auth($r);return DB::table('items')->whereNull('archived_at')->orderBy('name')->get()->map(fn($i)=>ims_item($i));});
 Route::post('/items',function(Request $r){$u=ims_auth($r);ims_need($u,'items');$d=$r->validate(['sku_id'=>'required|string|max:100','name'=>'required|string|max:255','category'=>'required|string|max:120','unit_price'=>'required|numeric|min:0','abc_class'=>'nullable|in:A,B,C','xyz_class'=>'nullable|in:X,Y,Z','handling_class'=>'nullable|string','lead_time_days'=>'nullable|integer|min:0','shelf_life_days'=>'nullable|integer|min:0','reorder_point'=>'nullable|integer|min:0','warranty_months'=>'nullable|integer|min:0|max:240','supplier_id'=>'nullable|integer']);if(array_key_exists('warranty_months',$d))$d['warranty_months']=(int)$d['warranty_months'];$id=DB::table('items')->insertGetId($d+['created_by'=>$u->id,'created_at'=>now(),'updated_at'=>now()]);ims_audit($u,'create','item',$id,$d);return response()->json(ims_item(DB::table('items')->find($id)),201);});
 Route::put('/items/{id}',function(Request $r,$id){$u=ims_auth($r);ims_need($u,'items');$i=DB::table('items')->find($id);if(!$i)abort(404,'Item not found.');$d=$r->validate(['name'=>'sometimes|required|string|max:255','category'=>'sometimes|required|string','unit_price'=>'sometimes|required|numeric|min:0','abc_class'=>'sometimes|in:A,B,C','xyz_class'=>'nullable|in:X,Y,Z','handling_class'=>'nullable|string','lead_time_days'=>'sometimes|integer|min:0','shelf_life_days'=>'sometimes|integer|min:0','reorder_point'=>'sometimes|integer|min:0','warranty_months'=>'sometimes|integer|min:0|max:240','supplier_id'=>'nullable|integer']);DB::table('items')->where('id',$id)->update($d+['updated_at'=>now()]);ims_audit($u,'update','item',$id,$d);return ims_item(DB::table('items')->find($id));});
 Route::post('/items/{id}/archive',function(Request $r,$id){$u=ims_auth($r);ims_need($u,'items');DB::table('items')->where('id',$id)->update(['archived_at'=>now(),'updated_at'=>now()]);ims_audit($u,'archive','item',$id);return ['ok'=>true];});
 Route::get('/batches',function(Request $r){ims_auth($r);$q=DB::table('batches as b')->join('items as i','i.id','=','b.item_id')->select('b.*','i.sku_id','i.name as item_name');if($r->filled('sku_id'))$q->where('i.sku_id',$r->query('sku_id'));return $q->orderByRaw('expiry_date IS NULL, expiry_date')->get()->map(function($b){$b->history=DB::table('movements')->where('batch_id',$b->id)->orderByDesc('id')->get();$b->status=$b->qty_remaining<=0?'depleted':(($b->expiry_date&&$b->expiry_date<today()->toDateString())?'expired':(($b->expiry_date&&$b->expiry_date<=today()->addDays(30)->toDateString())?'near_expiry':'active'));return $b;});});
 Route::delete('/batches/{lot}',function(Request $r,$lot){$u=ims_auth($r);ims_need($u,'stock');$b=DB::table('batches')->where('lot_id',$lot)->first();if(!$b)abort(404,'Batch not found.');$today=today()->toDateString();$isExpired=($b->expiry_date&&$b->expiry_date<$today)||$b->status==='expired';if(!$isExpired)abort(422,'Only expired batches can be deleted.');DB::transaction(function()use($b,$u){DB::table('item_serials')->where('batch_id',$b->id)->update(['batch_id'=>null]);DB::table('alerts')->where('batch_id',$b->id)->delete();DB::table('movements')->where('batch_id',$b->id)->delete();DB::table('batches')->where('id',$b->id)->delete();ims_audit($u,'delete','batch',$b->id,['lot_id'=>$b->lot_id,'expiry_date'=>$b->expiry_date,'qty_remaining'=>$b->qty_remaining,'reason'=>'Expired batch removal']);});return ['ok'=>true,'lot_id'=>$b->lot_id];});
 Route::post('/batches/purge-expired',function(Request $r){$u=ims_auth($r);ims_need($u,'stock');$today=today()->toDateString();$expired=DB::table('batches')->where('status','expired')->orWhere(function($q)use($today){$q->whereNotNull('expiry_date')->whereDate('expiry_date','<',$today);})->get();if($expired->isEmpty()){return ['ok'=>true,'count'=>0,'deleted_lots'=>[]];}DB::transaction(function()use($expired,$u){$ids=$expired->pluck('id')->all();DB::table('item_serials')->whereIn('batch_id',$ids)->update(['batch_id'=>null]);DB::table('alerts')->whereIn('batch_id',$ids)->delete();DB::table('movements')->whereIn('batch_id',$ids)->delete();DB::table('batches')->whereIn('id',$ids)->delete();foreach($expired as $b){ims_audit($u,'delete','batch',$b->id,['lot_id'=>$b->lot_id,'expiry_date'=>$b->expiry_date,'qty_remaining'=>$b->qty_remaining,'reason'=>'Purge expired batches']);}});return ['ok'=>true,'count'=>$expired->count(),'deleted_lots'=>$expired->pluck('lot_id')];});
 Route::post('/stock/receive',function(Request $r){$u=ims_auth($r);ims_need($u,'stock');$d=$r->validate(['sku_id'=>'required|string','lot_id'=>'required|string|max:120','quantity'=>'required|integer|min:1','received_date'=>'nullable|date','expiry_date'=>'nullable|date','purchase_order_id'=>'nullable|integer']);return DB::transaction(function()use($d,$u){$i=DB::table('items')->where('sku_id',$d['sku_id'])->lockForUpdate()->first();if(!$i)abort(404,'Item not found.');$received=$d['received_date']??today()->toDateString();$expiry=$d['expiry_date']??($i->shelf_life_days?date('Y-m-d',strtotime($received.' +'.$i->shelf_life_days.' days')):null);$id=DB::table('batches')->insertGetId(['lot_id'=>$d['lot_id'],'item_id'=>$i->id,'received_date'=>$received,'expiry_date'=>$expiry,'qty_received'=>$d['quantity'],'qty_remaining'=>$d['quantity'],'status'=>'active','purchase_order_id'=>$d['purchase_order_id']??null,'created_at'=>now(),'updated_at'=>now()]);DB::table('movements')->insert(['item_id'=>$i->id,'batch_id'=>$id,'type'=>'received','quantity'=>$d['quantity'],'reason'=>'Stock received','actor_id'=>$u->id,'created_at'=>now(),'updated_at'=>now()]);ims_audit($u,'receive','batch',$id,$d);return ['batch'=>DB::table('batches')->find($id)];});});
 Route::post('/stock/issue',function(Request $r){$u=ims_auth($r);ims_need($u,'stock');$d=$r->validate(['sku_id'=>'required|string','quantity'=>'required|integer|min:1','reason'=>'required|string|max:300']);return DB::transaction(function()use($d,$u){$i=DB::table('items')->where('sku_id',$d['sku_id'])->lockForUpdate()->first();if(!$i)abort(404,'Item not found.');$batches=DB::table('batches')->where('item_id',$i->id)->where('qty_remaining','>',0)->where(function($q){$q->whereNull('expiry_date')->orWhereDate('expiry_date','>=',today());})->orderByRaw('expiry_date IS NULL, expiry_date ASC')->orderBy('received_date')->lockForUpdate()->get();$available=$batches->sum('qty_remaining');if($available<$d['quantity'])abort(422,'Insufficient non-expired stock. Available: '.$available);$left=$d['quantity'];$used=[];foreach($batches as $b){if(!$left)break;$take=min($left,$b->qty_remaining);DB::table('batches')->where('id',$b->id)->decrement('qty_remaining',$take);DB::table('movements')->insert(['item_id'=>$i->id,'batch_id'=>$b->id,'type'=>'issued','quantity'=>$take,'reason'=>$d['reason'],'actor_id'=>$u->id,'created_at'=>now(),'updated_at'=>now()]);$used[]=['lot_id'=>$b->lot_id,'quantity'=>$take];$left-=$take;}ims_audit($u,'issue','item',$i->id,$d+['batches'=>$used]);return ['issued'=>$d['quantity'],'allocations'=>$used];});});
 Route::post('/stock/adjust',function(Request $r){$u=ims_auth($r);ims_need($u,'stock');$d=$r->validate(['lot_id'=>'required|string','quantity_delta'=>'required|integer|not_in:0','reason'=>'required|string|min:3|max:300']);return DB::transaction(function()use($d,$u){$b=DB::table('batches')->where('lot_id',$d['lot_id'])->lockForUpdate()->first();if(!$b)abort(404,'Batch not found.');$new=$b->qty_remaining+$d['quantity_delta'];if($new<0)abort(422,'Adjustment would make stock negative.');DB::table('batches')->where('id',$b->id)->update(['qty_remaining'=>$new,'updated_at'=>now()]);DB::table('movements')->insert(['item_id'=>$b->item_id,'batch_id'=>$b->id,'type'=>'adjustment','quantity'=>$d['quantity_delta'],'reason'=>$d['reason'],'actor_id'=>$u->id,'created_at'=>now(),'updated_at'=>now()]);ims_audit($u,'adjust','batch',$b->id,$d);return ['batch'=>DB::table('batches')->find($b->id)];});});
 Route::get('/reports/movements',function(Request $r){$u=ims_auth($r);ims_need($u,'reports');return DB::table('movements as m')->leftJoin('users as u','u.id','=','m.actor_id')->leftJoin('items as i','i.id','=','m.item_id')->leftJoin('batches as b','b.id','=','m.batch_id')->select('m.*','u.name as actor','i.sku_id','i.name as item_name','b.lot_id')->orderByDesc('m.id')->limit(5000)->get();});
 Route::get('/dashboard/summary',function(Request $r){ims_auth($r);$items=DB::table('items')->whereNull('archived_at')->get();$value=0;$below=0;foreach($items as $i){$q=DB::table('batches')->where('item_id',$i->id)->where(function($x){$x->whereNull('expiry_date')->orWhereDate('expiry_date','>=',today());})->sum('qty_remaining');$value+=$q*$i->unit_price;if($q<=$i->reorder_point)$below++;}return ['inventoryValue'=>round($value,2),'belowReorder'=>$below,'nearExpiryBatches'=>DB::table('batches')->where('qty_remaining','>',0)->whereBetween('expiry_date',[today()->toDateString(),today()->addDays(30)->toDateString()])->count(),'expiredBatches'=>DB::table('batches')->where('qty_remaining','>',0)->whereDate('expiry_date','<',today())->count(),'openAlerts'=>DB::table('alerts')->where('resolved',false)->count()];});
 Route::get('/suppliers',function(Request $r){$u=ims_auth($r);ims_need($u,'purchasing');return DB::table('suppliers')->orderBy('name')->get();});
 Route::post('/suppliers',function(Request $r){$u=ims_auth($r);ims_need($u,'purchasing');$d=$r->validate(['name'=>'required|string|max:255','contact_name'=>'nullable|string','email'=>'nullable|email','phone'=>'nullable|string','address'=>'nullable|string']);$id=DB::table('suppliers')->insertGetId($d+['created_at'=>now(),'updated_at'=>now()]);ims_audit($u,'create','supplier',$id,$d);return response()->json(DB::table('suppliers')->find($id),201);});
 Route::get('/users',function(Request $r){$u=ims_auth($r);ims_need($u,'users');return DB::table('users')->select('id','name','username','role','active','created_at')->orderBy('name')->get();});
 Route::post('/users',function(Request $r){$u=ims_auth($r);ims_need($u,'users');$d=$r->validate(['name'=>'required|string|max:255','username'=>'required|string|max:100|unique:users,username','password'=>'required|string|min:12','role'=>'required|in:Admin,Warehouse Staff,Viewer']);$id=DB::table('users')->insertGetId(['name'=>$d['name'],'username'=>$d['username'],'password'=>Hash::make($d['password']),'role'=>$d['role'],'active'=>true,'created_at'=>now(),'updated_at'=>now()]);ims_audit($u,'create','user',$id,['username'=>$d['username'],'role'=>$d['role']]);return response()->json(DB::table('users')->select('id','name','username','role','active')->find($id),201);});
 Route::patch('/users/{id}',function(Request $r,$id){$u=ims_auth($r);ims_need($u,'users');$d=$r->validate(['name'=>'sometimes|string|max:255','role'=>'sometimes|in:Admin,Warehouse Staff,Viewer','active'=>'sometimes|boolean','password'=>'sometimes|string|min:12']);if((int)$id===(int)$u->id&&(($d['active']??true)===false||isset($d['role'])&&$d['role']!=='Admin'))abort(422,'You cannot disable or demote your own account.');$update=[];foreach(['name','role','active'] as $k)if(array_key_exists($k,$d))$update[$k]=$d[$k];if(isset($d['password']))$update['password']=Hash::make($d['password']);$update['updated_at']=now();DB::table('users')->where('id',$id)->update($update);ims_audit($u,'update','user',$id,array_diff_key($d,['password'=>true]));return ['ok'=>true];});
 Route::get('/alerts',function(Request $r){ims_auth($r);return DB::table('alerts')->orderBy('resolved')->orderByDesc('created_at')->get()->map(function($a){$a->meta=$a->meta?json_decode($a->meta,true):null;return $a;});});
 Route::patch('/alerts/{id}',function(Request $r,$id){$u=ims_auth($r);$a=DB::table('alerts')->find($id);if(!$a)abort(404,'Alert not found.');if($r->boolean('resolved')){ims_need($u,'alerts');$d=$r->validate(['resolved'=>'required|boolean','resolution_notes'=>'required|string|min:3|max:1000']);DB::table('alerts')->where('id',$id)->update(['resolved'=>true,'resolved_by'=>$u->id,'resolved_at'=>now(),'resolution_notes'=>$d['resolution_notes'],'updated_at'=>now()]);ims_audit($u,'resolve','alert',$id,$d);}elseif($r->filled('snooze_hours')){ims_need($u,'alerts');$d=$r->validate(['snooze_hours'=>'required|integer|min:1|max:720']);DB::table('alerts')->where('id',$id)->update(['snoozed_until'=>now()->addHours($d['snooze_hours']),'updated_at'=>now()]);ims_audit($u,'snooze','alert',$id,$d);}return DB::table('alerts')->find($id);});
 Route::get('/reports/reorder-suggestions',function(Request $r){$u=ims_auth($r);ims_need($u,'reports');return DB::table('items')->whereNull('archived_at')->get()->map(function($i){$stock=DB::table('batches')->where('item_id',$i->id)->where(function($q){$q->whereNull('expiry_date')->orWhereDate('expiry_date','>=',today());})->sum('qty_remaining');$target=$i->reorder_point+($i->lead_time_days>0?ceil($i->reorder_point*min($i->lead_time_days,30)/30):0);return ['sku_id'=>$i->sku_id,'name'=>$i->name,'on_hand'=>(int)$stock,'reorder_point'=>$i->reorder_point,'lead_time_days'=>$i->lead_time_days,'suggested_order_qty'=>max(0,(int)$target-(int)$stock),'abc_class'=>$i->abc_class,'xyz_class'=>$i->xyz_class];})->filter(fn($i)=>$i['suggested_order_qty']>0)->values();});

 // ===========================================================================
 // Session
 // ===========================================================================
 Route::post('/auth/logout', function (Request $r) {
  $u = ims_auth($r);
  DB::table('personal_access_tokens')->where('token_hash', hash('sha256', $r->bearerToken()))->delete();
  ims_audit($u, 'logout', 'user', $u->id);
  return ['ok' => true];
 });

 // ===========================================================================
 // Serial numbers & warranty
 // Read: any signed-in role.  Write: roles with the "stock" permission.
 // ===========================================================================
 Route::get('/serials', function (Request $r) {
  ims_auth($r);
  $today = today()->toDateString();
  $soon = today()->addDays(30)->toDateString();
  $q = DB::table('item_serials as s')->join('items as i', 'i.id', '=', 's.item_id')->leftJoin('batches as b', 'b.id', '=', 's.batch_id')
   ->select('s.*', 'i.sku_id', 'i.name as item_name', 'i.warranty_months', 'b.lot_id');
  if ($r->filled('status')) $q->where('s.status', $r->query('status'));
  if ($r->filled('sku_id')) $q->where('i.sku_id', $r->query('sku_id'));
  if ($r->filled('lot_id')) $q->where('b.lot_id', $r->query('lot_id'));
  if ($r->filled('q')) {
   $t = '%' . $r->query('q') . '%';
   $q->where(function ($w) use ($t) {
    $w->where('s.serial_number', 'like', $t)->orWhere('s.customer_name', 'like', $t)->orWhere('s.customer_contact', 'like', $t)
     ->orWhere('i.name', 'like', $t)->orWhere('i.sku_id', 'like', $t);
   });
  }
  if ($r->filled('warranty')) {
   $q->whereIn('s.status', ['sold', 'defective']);
   if ($r->query('warranty') === 'expired') $q->whereNotNull('s.warranty_end')->where('s.warranty_end', '<', $today);
   if ($r->query('warranty') === 'expiring_soon') $q->whereBetween('s.warranty_end', [$today, $soon]);
   if ($r->query('warranty') === 'active') $q->where('s.warranty_end', '>', $soon);
  }
  $rows = $q->orderByDesc('s.id')->limit(500)->get()->map(fn($x) => ims_warranty($x));
  $summary = ['total' => DB::table('item_serials')->count()];
  foreach (['in_stock', 'sold', 'returned', 'defective'] as $s) $summary[$s] = DB::table('item_serials')->where('status', $s)->count();
  $summary['expiring_soon'] = DB::table('item_serials')->whereIn('status', ['sold', 'defective'])->whereBetween('warranty_end', [$today, $soon])->count();
  $summary['expired'] = DB::table('item_serials')->whereIn('status', ['sold', 'defective'])->whereNotNull('warranty_end')->where('warranty_end', '<', $today)->count();
  return ['data' => $rows, 'summary' => $summary];
 });

 Route::post('/serials', function (Request $r) {
  $u = ims_auth($r); ims_need($u, 'stock');
  $d = $r->validate([
   'sku_id' => 'required|string', 'lot_id' => 'nullable|string',
   'serials' => 'required|array|min:1|max:500', 'serials.*' => 'required|string|max:120',
   'notes' => 'nullable|string|max:500',
  ]);
  $serials = array_values(array_unique(array_filter(array_map(fn($s) => trim($s), $d['serials']), fn($s) => $s !== '')));
  if (!$serials) abort(422, 'Enter at least one serial number.');
  return DB::transaction(function () use ($d, $serials, $u) {
   $item = DB::table('items')->where('sku_id', $d['sku_id'])->first();
   if (!$item) abort(404, 'Item not found.');
   $batch = null;
   if (!empty($d['lot_id'])) {
    $batch = DB::table('batches')->where('lot_id', $d['lot_id'])->where('item_id', $item->id)->lockForUpdate()->first();
    if (!$batch) abort(422, 'Lot ' . $d['lot_id'] . ' does not belong to ' . $item->sku_id . '.');
    $already = DB::table('item_serials')->where('batch_id', $batch->id)->count();
    if ($already + count($serials) > $batch->qty_received)
     abort(422, 'Lot ' . $batch->lot_id . ' received ' . $batch->qty_received . ' units and already has ' . $already . ' serial numbers registered.');
   }
   $dupes = DB::table('item_serials')->whereIn('serial_number', $serials)->pluck('serial_number')->all();
   if ($dupes) abort(422, 'Already registered: ' . implode(', ', array_slice($dupes, 0, 5)) . (count($dupes) > 5 ? ' and ' . (count($dupes) - 5) . ' more' : '') . '.');
   foreach ($serials as $sn) {
    DB::table('item_serials')->insert([
     'serial_number' => $sn, 'item_id' => $item->id, 'batch_id' => $batch->id ?? null, 'status' => 'in_stock',
     'notes' => $d['notes'] ?? null, 'created_by' => $u->id, 'created_at' => now(), 'updated_at' => now(),
    ]);
   }
   ims_audit($u, 'register_serials', 'item', $item->id, ['sku_id' => $item->sku_id, 'lot_id' => $d['lot_id'] ?? null, 'count' => count($serials), 'first' => $serials[0]]);
   return response()->json(['created' => count($serials)], 201);
  });
 });

 Route::post('/serials/{id}/status', function (Request $r, $id) {
  $u = ims_auth($r); ims_need($u, 'stock');
  $d = $r->validate([
   'to' => 'required|in:sold,returned,defective',
   'customer_name' => 'required_if:to,sold|nullable|string|max:255',
   'customer_contact' => 'nullable|string|max:120',
   'sold_at' => 'nullable|date|before_or_equal:today',
   'notes' => 'nullable|string|max:500',
  ]);
  return DB::transaction(function () use ($d, $id, $u) {
   $s = DB::table('item_serials')->where('id', $id)->lockForUpdate()->first();
   if (!$s) abort(404, 'Serial number not found.');
   $delta = ims_serial_stock_delta($s->status, $d['to']);
   if ($delta === null) abort(422, 'A unit that is ' . str_replace('_', ' ', $s->status) . ' cannot be changed to ' . $d['to'] . '.');
   $item = DB::table('items')->find($s->item_id);
   $update = ['status' => $d['to'], 'updated_at' => now()];
   if (!empty($d['notes'])) $update['notes'] = $d['notes'];
   if ($d['to'] === 'sold') {
    $soldAt = $d['sold_at'] ?? today()->toDateString();
    $update['customer_name'] = $d['customer_name'];
    $update['customer_contact'] = $d['customer_contact'] ?? null;
    $update['sold_at'] = $soldAt;
    $update['warranty_start'] = $soldAt;
    $update['warranty_end'] = $item->warranty_months > 0 ? \Illuminate\Support\Carbon::parse($soldAt)->addMonthsNoOverflow((int) $item->warranty_months)->toDateString() : null;
   }
   if ($d['to'] === 'returned') {
    foreach (['customer_name', 'customer_contact', 'sold_at', 'warranty_start', 'warranty_end'] as $k) $update[$k] = null;
   }
   // Keep stock quantities honest: a sale issues one unit, a resellable return restocks one,
   // and a defective unit that was in stock is written off.
   if ($delta !== 0 && $s->batch_id) {
    $b = DB::table('batches')->where('id', $s->batch_id)->lockForUpdate()->first();
    if ($b) {
     if ($delta < 0 && $b->qty_remaining < 1) abort(422, 'Lot ' . $b->lot_id . ' has no stock left to issue.');
     if ($d['to'] === 'sold' && $b->expiry_date && $b->expiry_date < today()->toDateString()) abort(422, 'Lot ' . $b->lot_id . ' is expired and cannot be sold.');
     DB::table('batches')->where('id', $b->id)->update(['qty_remaining' => $b->qty_remaining + $delta, 'updated_at' => now()]);
     $reason = ['sold' => 'Sold - serial ' . $s->serial_number, 'returned' => 'Customer return - serial ' . $s->serial_number, 'defective' => 'Written off as defective - serial ' . $s->serial_number][$d['to']];
     DB::table('movements')->insert([
      'item_id' => $s->item_id, 'batch_id' => $b->id, 'type' => $d['to'] === 'sold' ? 'issued' : 'adjustment',
      'quantity' => $d['to'] === 'sold' ? 1 : $delta, 'reason' => $reason, 'actor_id' => $u->id,
      'details' => json_encode(['serial' => $s->serial_number]), 'created_at' => now(), 'updated_at' => now(),
     ]);
    }
   }
   DB::table('item_serials')->where('id', $id)->update($update);
   ims_audit($u, 'serial_' . $d['to'], 'serial', $id, [
    'serial' => $s->serial_number, 'from' => $s->status, 'to' => $d['to'],
    'customer' => $d['customer_name'] ?? $s->customer_name, 'stock_change' => $s->batch_id ? $delta : 0,
   ]);
   return ims_serial_row($id);
  });
 });

 // ===========================================================================
 // Suppliers (edit) and purchase orders: draft -> ordered (approved) -> received
 // ===========================================================================
 Route::put('/suppliers/{id}', function (Request $r, $id) {
  $u = ims_auth($r); ims_need($u, 'purchasing');
  if (!DB::table('suppliers')->find($id)) abort(404, 'Supplier not found.');
  $d = $r->validate(['name' => 'sometimes|required|string|max:255', 'contact_name' => 'nullable|string|max:255', 'email' => 'nullable|email', 'phone' => 'nullable|string|max:60', 'address' => 'nullable|string|max:500']);
  DB::table('suppliers')->where('id', $id)->update($d + ['updated_at' => now()]);
  ims_audit($u, 'update', 'supplier', $id, $d);
  return DB::table('suppliers')->find($id);
 });

 Route::get('/purchase-orders', function (Request $r) {
  $u = ims_auth($r); ims_need($u, 'purchasing');
  $q = DB::table('purchase_orders as p')->join('suppliers as s', 's.id', '=', 'p.supplier_id')->leftJoin('users as c', 'c.id', '=', 'p.created_by')
   ->select('p.*', 's.name as supplier_name', 'c.name as created_by_name')
   ->selectRaw('(select count(*) from purchase_order_lines l where l.purchase_order_id = p.id) as line_count')
   ->selectRaw('(select coalesce(sum(l.quantity_ordered), 0) from purchase_order_lines l where l.purchase_order_id = p.id) as qty_ordered')
   ->selectRaw('(select coalesce(sum(l.quantity_received), 0) from purchase_order_lines l where l.purchase_order_id = p.id) as qty_received')
   ->selectRaw('(select coalesce(sum(l.quantity_ordered * l.unit_cost), 0) from purchase_order_lines l where l.purchase_order_id = p.id) as total_cost');
  if ($r->filled('status')) $q->where('p.status', $r->query('status'));
  return $q->orderByDesc('p.id')->get();
 });

 Route::get('/purchase-orders/{id}', function (Request $r, $id) {
  $u = ims_auth($r); ims_need($u, 'purchasing');
  $po = ims_po($id);
  $batches = DB::table('batches as b')->join('items as i', 'i.id', '=', 'b.item_id')->where('b.purchase_order_id', $id)
   ->select('b.lot_id', 'b.received_date', 'b.expiry_date', 'b.qty_received', 'b.qty_remaining', 'i.sku_id', 'i.name as item_name')->orderBy('b.id')->get();
  return ['purchase_order' => $po, 'lines' => ims_po_lines($id), 'batches' => $batches];
 });

 Route::post('/purchase-orders', function (Request $r) {
  $u = ims_auth($r); ims_need($u, 'purchasing');
  $d = $r->validate([
   'po_number' => 'nullable|string|max:60|unique:purchase_orders,po_number',
   'supplier_id' => 'required|integer|exists:suppliers,id',
   'lines' => 'required|array|min:1|max:100',
   'lines.*.item_id' => 'required|integer|exists:items,id',
   'lines.*.quantity_ordered' => 'required|integer|min:1|max:100000',
   'lines.*.unit_cost' => 'nullable|numeric|min:0',
   'expected_at' => 'nullable|date', 'notes' => 'nullable|string|max:1000',
  ]);
  $ids = array_column($d['lines'], 'item_id');
  if (count($ids) !== count(array_unique($ids))) abort(422, 'Each item can appear on a purchase order only once.');
  return DB::transaction(function () use ($d, $u) {
   $number = $d['po_number'] ?? ims_po_number();
   $id = DB::table('purchase_orders')->insertGetId([
    'po_number' => $number, 'supplier_id' => $d['supplier_id'], 'status' => 'draft', 'ordered_at' => null,
    'expected_at' => $d['expected_at'] ?? null, 'notes' => $d['notes'] ?? null, 'created_by' => $u->id,
    'created_at' => now(), 'updated_at' => now(),
   ]);
   $total = 0;
   foreach ($d['lines'] as $l) {
    $cost = $l['unit_cost'] ?? 0;
    $total += $cost * $l['quantity_ordered'];
    DB::table('purchase_order_lines')->insert([
     'purchase_order_id' => $id, 'item_id' => $l['item_id'], 'quantity_ordered' => $l['quantity_ordered'],
     'unit_cost' => $cost, 'created_at' => now(), 'updated_at' => now(),
    ]);
   }
   ims_audit($u, 'create', 'purchase_order', $id, ['po_number' => $number, 'supplier_id' => $d['supplier_id'], 'lines' => count($d['lines']), 'total' => round($total, 2)]);
   return response()->json(['purchase_order' => ims_po($id), 'lines' => ims_po_lines($id)], 201);
  });
 });

 Route::post('/purchase-orders/{id}/approve', function (Request $r, $id) {
  $u = ims_auth($r); ims_need($u, 'po_approve');
  return DB::transaction(function () use ($id, $u) {
   $po = DB::table('purchase_orders')->where('id', $id)->lockForUpdate()->first();
   if (!$po) abort(404, 'Purchase order not found.');
   if ($po->status !== 'draft') abort(422, 'Only draft purchase orders can be approved.');
   DB::table('purchase_orders')->where('id', $id)->update([
    'status' => 'ordered', 'ordered_at' => today()->toDateString(), 'approved_by' => $u->id, 'approved_at' => now(), 'updated_at' => now(),
   ]);
   ims_audit($u, 'approve', 'purchase_order', $id, ['po_number' => $po->po_number]);
   return ['purchase_order' => ims_po($id)];
  });
 });

 Route::post('/purchase-orders/{id}/cancel', function (Request $r, $id) {
  $u = ims_auth($r); ims_need($u, 'purchasing');
  $d = $r->validate(['reason' => 'required|string|min:3|max:500']);
  return DB::transaction(function () use ($d, $id, $u) {
   $po = DB::table('purchase_orders')->where('id', $id)->lockForUpdate()->first();
   if (!$po) abort(404, 'Purchase order not found.');
   if (!in_array($po->status, ['draft', 'ordered'], true)) abort(422, 'Only draft or approved orders that have not been received can be cancelled.');
   if ($po->status === 'ordered') ims_need($u, 'po_approve'); // cancelling an approved order is an approver decision
   DB::table('purchase_orders')->where('id', $id)->update(['status' => 'cancelled', 'cancelled_at' => now(), 'cancel_reason' => $d['reason'], 'updated_at' => now()]);
   ims_audit($u, 'cancel', 'purchase_order', $id, ['po_number' => $po->po_number, 'reason' => $d['reason'], 'was' => $po->status]);
   return ['purchase_order' => ims_po($id)];
  });
 });

 Route::post('/purchase-orders/{id}/receive', function (Request $r, $id) {
  $u = ims_auth($r); ims_need($u, 'purchasing');
  $d = $r->validate([
   'lines' => 'required|array|min:1', 'lines.*.line_id' => 'required|integer', 'lines.*.lot_id' => 'required|string|max:120',
   'lines.*.quantity' => 'required|integer|min:1', 'lines.*.received_date' => 'nullable|date', 'lines.*.expiry_date' => 'nullable|date',
  ]);
  return DB::transaction(function () use ($d, $id, $u) {
   $po = DB::table('purchase_orders')->where('id', $id)->lockForUpdate()->first();
   if (!$po) abort(404, 'Purchase order not found.');
   if ($po->status === 'draft') abort(422, 'This purchase order is still waiting for approval.');
   if ($po->status === 'cancelled') abort(422, 'This purchase order was cancelled.');
   if ($po->status === 'received') abort(422, 'This purchase order has already been fully received.');
   foreach ($d['lines'] as $l) {
    $line = DB::table('purchase_order_lines')->where('id', $l['line_id'])->where('purchase_order_id', $id)->lockForUpdate()->first();
    if (!$line) abort(422, 'A receipt line does not belong to this purchase order.');
    if ($line->quantity_received + $l['quantity'] > $line->quantity_ordered) abort(422, 'Receipt exceeds ordered quantity.');
    if (DB::table('batches')->where('lot_id', $l['lot_id'])->exists()) abort(422, 'Lot ' . $l['lot_id'] . ' already exists. Use a unique lot ID.');
    $item = DB::table('items')->find($line->item_id);
    $received = $l['received_date'] ?? today()->toDateString();
    $expiry = $l['expiry_date'] ?? ($item->shelf_life_days ? date('Y-m-d', strtotime($received . ' +' . $item->shelf_life_days . ' days')) : null);
    $bid = DB::table('batches')->insertGetId([
     'lot_id' => $l['lot_id'], 'item_id' => $item->id, 'received_date' => $received, 'expiry_date' => $expiry,
     'qty_received' => $l['quantity'], 'qty_remaining' => $l['quantity'], 'status' => 'active', 'purchase_order_id' => $id,
     'created_at' => now(), 'updated_at' => now(),
    ]);
    DB::table('purchase_order_lines')->where('id', $line->id)->increment('quantity_received', $l['quantity']);
    DB::table('movements')->insert([
     'item_id' => $item->id, 'batch_id' => $bid, 'type' => 'received', 'quantity' => $l['quantity'],
     'reason' => 'Received against ' . $po->po_number, 'actor_id' => $u->id, 'created_at' => now(), 'updated_at' => now(),
    ]);
   }
   $pending = DB::table('purchase_order_lines')->where('purchase_order_id', $id)->whereColumn('quantity_received', '<', 'quantity_ordered')->exists();
   $status = $pending ? 'partially_received' : 'received';
   DB::table('purchase_orders')->where('id', $id)->update(['status' => $status, 'updated_at' => now()]);
   ims_audit($u, 'receive_purchase_order', 'purchase_order', $id, ['po_number' => $po->po_number, 'lines' => count($d['lines']), 'status' => $status]);
   return ['status' => $status, 'received' => count($d['lines'])];
  });
 });

 // ===========================================================================
 // Audit log (Admin): filter + paginate
 // ===========================================================================
 Route::get('/audit', function (Request $r) {
  $u = ims_auth($r); ims_need($u, 'settings');
  $q = DB::table('audit_log as a')->leftJoin('users as u', 'u.id', '=', 'a.actor_id');
  if ($r->filled('actor_id')) $q->where('a.actor_id', $r->query('actor_id'));
  if ($r->filled('action')) $q->where('a.action', $r->query('action'));
  if ($r->filled('entity_type')) $q->where('a.entity_type', $r->query('entity_type'));
  if ($r->filled('from')) $q->whereDate('a.created_at', '>=', $r->query('from'));
  if ($r->filled('to')) $q->whereDate('a.created_at', '<=', $r->query('to'));
  if ($r->filled('q')) {
   $t = '%' . $r->query('q') . '%';
   $q->where(function ($w) use ($t) {
    $w->where('a.entity_id', 'like', $t)->orWhere('a.details', 'like', $t)->orWhere('a.action', 'like', $t)
     ->orWhere('u.name', 'like', $t)->orWhere('u.username', 'like', $t);
   });
  }
  $total = (clone $q)->count();
  $per = min(200, max(1, (int) $r->query('per_page', 50)));
  $page = max(1, (int) $r->query('page', 1));
  $rows = $q->select('a.*', 'u.name as actor', 'u.username as actor_username')->orderByDesc('a.id')->forPage($page, $per)->get()
   ->map(function ($a) { $a->details = $a->details ? json_decode($a->details, true) : null; return $a; });
  return [
   'data' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $per,
   'actions' => DB::table('audit_log')->distinct()->orderBy('action')->pluck('action'),
   'entity_types' => DB::table('audit_log')->distinct()->orderBy('entity_type')->pluck('entity_type'),
   'actors' => DB::table('users')->select('id', 'name', 'username')->orderBy('name')->get(),
  ];
 });

});