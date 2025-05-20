FROM nginx:alpine
COPY proxy/nginx.conf /etc/nginx/nginx.conf
COPY static/dist /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
