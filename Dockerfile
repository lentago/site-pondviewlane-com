# Dockerfile for pondviewlane.com + essexcrossingatmontserrat.com
#
# Same pattern as site-lentago-dev / site-icecreamtofightwith-com: CI builds the
# Astro site (npm run build), Docker only packages the built output into nginx
# for the solidago ECS platform (ALB expects :8080 and /health).
#
# Two domains, one container: CI builds the content tree twice (SITE=pondview and
# SITE=essexcrossing → dist-pondview / dist-essexcrossing), and nginx serves each
# from its own root, Host-switched (see nginx.conf).
# PDFs in the library are served with long cache headers; see nginx-common.conf.

FROM nginx:latest

COPY nginx.conf /etc/nginx/conf.d/default.conf
# Shared vhost config, included by both server blocks. Kept out of conf.d/ (it is
# not a standalone server, so nginx must not auto-load it at http level).
COPY nginx-common.conf /etc/nginx/nginx-common.conf
# Security-header set, `include`d from nginx-common.conf and re-`include`d in
# every location block that declares its own add_header (see nginx-common.conf
# and nginx.conf's www redirects) — same reason this is kept out of conf.d/.
COPY nginx-security-headers.conf /etc/nginx/nginx-security-headers.conf
COPY dist-pondview/ /usr/share/nginx/html/pondview/
COPY dist-essexcrossing/ /usr/share/nginx/html/essex/

EXPOSE 8080
