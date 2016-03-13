# Easywyg Fileserver

Fileserver for Easywyg rich text editor. Allow to upload images from Easywyg editor and serve them.

### Installation

```bash
npm install -g easywyg-fileserver
```

After installation, create `config.yml` somewhere in your filesystem and copy following configuration options into that file.

### Example configuration

```yaml
server:
  host: localhost
  port: 9001
file:
  fieldName: file
  maxSize: 10000000 # bytes
storage:
  root: '/var/www/example.com/uploads'
  path: 'uploads/%y/%m/%d'
  filename: '%name.%ext'
  url: 'http://uploads.example.com'
  xSendfileEnabled: false
  xSendfileHeader: 'X-Accel-Redirect' # or X-Sendfile
routes:
  upload: '/upload'
  copy: '/copy'
```

### Running server

```bash
$ easywyg-fileserver --config /path/to/config.yml
```

### Using Easywyg Fileserver behind Nginx

Take the following configuration to use Nginx as a front-end proxy and Easywyg Fileserver as a back-end. This configuration also supports `X-Accel-Redirect` to serve images via Nginx.

```
server {
    listen 80;
    server_name uploads.example.com;

    location / {
        proxy_pass         http://127.0.0.1:9001/;
        proxy_redirect     off;

        proxy_set_header   Host             $host;
        proxy_set_header   X-Real-IP        $remote_addr;
        proxy_set_header   X-Forwarded-For  $proxy_add_x_forwarded_for;

        client_max_body_size       10m;
        client_body_buffer_size    128k;

        proxy_connect_timeout      90;
        proxy_send_timeout         90;
        proxy_read_timeout         90;

        proxy_buffer_size          4k;
        proxy_buffers              4 32k;
        proxy_busy_buffers_size    64k;
        proxy_temp_file_write_size 64k;

    }

    location /serve/ {
        alias /tmp/;
        internal;
    }
}
```

This Nginx configuration work together with following Easywyg Fileserver configuration:

```yaml
server:
  host: localhost
  port: 9001
file:
  fieldName: file
  maxSize: 10000000 # bytes
storage:
  root: '/tmp'
  path: 'uploads/%y/%m/%d'
  filename: '%name.%ext'
  url: 'http://uploads.example.com'
  xSendfileEnabled: true
  xSendfileHeader: 'X-Accel-Redirect' # or X-Sendfile
routes:
  upload: '/upload'
  copy: '/copy'
```
