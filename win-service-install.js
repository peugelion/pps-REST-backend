// https://github.com/coreybutler/node-windows

var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name:'Ep Supervizor Web BO Server [node.js]',
  description: 'mssql <-> web api [node.js BO] \ web app server [angular 6].',
  // script: 'C:\\Projects\\pps-REST-backend\\app.js',
  script: require('path').join(__dirname,'\\app.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
});

svc.install();