# Easywyg Fileserver

Fileserver for Easywyg rich text editor. Allow to upload images from Easywyg editor and serve them.

### Installation

```bash
npm install -g easywyg-fileserver
```

After installation, create `config.yml` somewhere in your filesystem and copy following configuration options into that file.

### Example configuration

```yaml
# ef-config.yml
server:
  host: example.com
  port: 12320
storage:
  root: '/var/www/example.com/uploads'
  path: 'uploads/%y/%m/%d'
  filename: '%name.%ext'
  maxFileSize: 5242880 # 5 megabytes
serve:
  enabled: false
  via: 'fileserver' # or 'webserver'
  # When serve via webserver
  xSendfileHeader: 'X-Accel-Redirect' # or X-Sendfile
```

### Running server

```bash
$ easywyg-fileserver --config /path/to/ef-config.yml
```
or with ENV variable

```bash
$ EF_CONFIG=/path/to/ef-config.yml easywyg-fileserver
```

### API

#### Upload image
```bash
$ curl -F "file=@/tmp/image.jpg" -X POST http://localhost:12320/upload
```

You will get JSON response from the server after upload image:

```json
{
  "original":"image.jpg",
  "url":"http://localhost:12320/uploads/2016/03/13/bcb41a31-62a9-47ac-9aa3-d7e946318477.jpg",
  "size":131128,
  "mimetype":"image/jpeg"
}
```

#### Copy image from remote url
```bash
$ curl -X POST -d "url=https://www.google.ru/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" http://localhost:12320/copy
```

You will get JSON response from the server after copy image:

```json
{
  "original":"googlelogo_color_272x92dp.png",
  "url":"http://localhost:12320/uploads/2016/03/13/aab33b54-62a9-47ac-9aa3-d7e946318477.jpg",
  "size":234865,
  "mimetype":"image/png"
}
```

#### Serve image
```bash
$ curl http://localhost:12320/uploads/2016/02/26/ae10175f-9a59-4998-8bea-4c5c4387ace7.jpg
```

#### Error handling
If any error occurs, you will get error response from the server and appropriate http status.

```json
{
  "error":"File not found"
}
```

### init.d script

Copy [sample init.d script](https://github.com/easywyg/easywyg-fileserver/tree/master/init.d/easywyg-fileserver) into `/etc/init.d/easywyg-fileserver` then configure it.
After making necessary settings, execute following commands:

```bash
$ sudo chmod +x /etc/init.d/easywyg-fileserver
$ sudo update-rc.d easywyg-fileserver defaults
```

Now you can run/stop fileserver using `service easywyg-fileserver start` and `service easywyg-fileserver stop`.

### Using Easywyg Fileserver behind Nginx. Serve files via Nginx.

Take the following configuration to use Nginx as a front-end proxy and Easywyg Fileserver as a back-end.

```
server {
    listen <YOUR_SERVER_IP>:80;
    server_name fileserver.example.com;

    location / {
        proxy_pass         http://127.0.0.1:12320/;
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
       alias /home/example.com/shared/public/uploads/;
       internal;
    }
}
```

This Nginx configuration work together with following Easywyg Fileserver configuration:

```yaml
# ef-config.yml
server:
  host: localhost
  port: 12320
storage:
  root: '/tmp'
  path: 'uploads/%y/%m/%d'
  filename: '%name.%ext'
  maxFileSize: 5242880 # 5 megabytes
serve:
  enabled: true
  via: 'webserver' # or 'fileserver'
  # When serve via webserver
  xSendfileHeader: 'X-Accel-Redirect' # or X-Sendfile
```
