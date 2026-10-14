FROM php:8.4-cli
RUN apt-get update && apt-get install -y --no-install-recommends git unzip libzip-dev \
 && docker-php-ext-install pdo_mysql zip && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app
RUN docker-php-ext-install opcache && { \
 echo 'opcache.enable=1'; echo 'opcache.enable_cli=1'; echo 'opcache.memory_consumption=128'; \
 echo 'opcache.max_accelerated_files=20000'; echo 'opcache.validate_timestamps=1'; echo 'opcache.revalidate_freq=2'; \
 echo 'realpath_cache_size=4096K'; echo 'realpath_cache_ttl=600'; \
 } > /usr/local/etc/php/conf.d/zz-opcache.ini
