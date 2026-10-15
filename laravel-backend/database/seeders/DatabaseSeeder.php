<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
class DatabaseSeeder extends Seeder {
 public function run(): void {
  $this->seedAdmin();
  // Sample items and batches. Set SEED_DEMO_DATA=false in .env to skip (e.g. on a real deployment).
  if (filter_var(env('SEED_DEMO_DATA', true), FILTER_VALIDATE_BOOLEAN)) {
   $this->call(DemoDataSeeder::class);
  }
 }
 private function seedAdmin(): void {
  $username=env('ADMIN_USERNAME','admin'); $password=env('ADMIN_PASSWORD');
  if(!$password || $password==='change-this-password') { $this->command?->warn('Set ADMIN_PASSWORD in .env before seeding the administrator.'); return; }
  if(!DB::table('users')->where('username',$username)->exists()) DB::table('users')->insert(['name'=>env('ADMIN_NAME','System Admin'),'username'=>$username,'password'=>Hash::make($password),'role'=>'Admin','active'=>true,'created_at'=>now(),'updated_at'=>now()]);
 }
}
