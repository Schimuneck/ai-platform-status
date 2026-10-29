FROM registry.access.redhat.com/ubi9/nginx-122:latest

COPY index.html styles.css app.js products.json ${NGINX_APP_ROOT}/src/

CMD nginx -g "daemon off;"
