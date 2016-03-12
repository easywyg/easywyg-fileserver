# Easywyg Fileserver

Fileserver for Easywyg rich text editor. Allow to upload images from Easywyg and serve them.

### Installation

```bash
npm install -g easywyg-fileserver
```

After installation, create `config.yml` somewhere in your filesystem and copy following configuration options into that file.

### Configuration

```yaml
server:
  host: 'localhost'
  port: 9001
  pid: /var/run/easywyg-fileserver.pid
file:
  fieldName: 'file'
  maxSize: 1000000 # bytes
storage:
  root: '/media/tanraya/sandbox/commercial/easywyg/easywyg-fileserver'
  path: 'uploads/%y/%m/%d'
  filename: '%name.%ext'
  url: 'http://localhost:9001'
  xSendfileEnabled: true
  xSendfileHeader: 'X-Accel-Reirect' # or X-Sendfile
routes:
  upload: '/upload'
  copy: '/copy'
```

### Running server

```bash
easywyg-fileserver --config /path/to/config.yml
```

### Using Easywyg Fileserver behind Nginx
