/*module.exports = {
  apps : [{
    script: 'index.js',
    watch: '.'
  }, {
    script: './service-worker/',
    watch: ['./service-worker']
  }],

  deploy : {
    production : {
      user : 'SSH_USERNAME',
      host : 'SSH_HOSTMACHINE',
      ref  : 'origin/master',
      repo : 'GIT_REPOSITORY',
      path : 'DESTINATION_PATH',
      'pre-deploy-local': '',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};*/
module.exports = {
  apps : [{
    name   : "my-next-js-app",
    script : "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
    args: "run start",
    error_file: './logs/service_gateway.err',
    log_date_format: 'YYYY-MM-DD HH:mm:ss SSS',
  }]
}