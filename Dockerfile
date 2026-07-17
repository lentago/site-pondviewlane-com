# Dockerfile for pondviewlane.com
#
# Same pattern as site-lentago-dev / site-icecreamtofightwith-com: CI builds
# the Astro site (npm run build), Docker only packages dist/ into nginx for
# the solidago ECS platform (ALB expects :8080 and /health).
# PDFs in the library are served with long cache headers; see nginx.conf.

FROM nginx:latest

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/

EXPOSE 8080
