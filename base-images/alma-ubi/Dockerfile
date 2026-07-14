FROM almalinux:9-minimal

RUN microdnf update -y \
    && microdnf install -y bash git unzip tar gzip openssl findutils which ca-certificates \
    && microdnf clean all \
    && rm -rf /var/cache/dnf /var/cache/yum

RUN groupadd -g 1000 appuser \
    && useradd -u 1000 -g appuser -m -d /app -s /bin/bash appuser \
    && mkdir -p /app \
    && chown appuser:appuser /app

WORKDIR /app
USER appuser
CMD ["/bin/bash"]
