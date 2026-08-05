FROM almalinux:9-minimal

# No git: it pulls openssh/openssh-clients, which are unused at runtime and
# repeatedly surface client-side OpenSSH CVEs in Trivy (e.g. ALSA-2026:47756).
RUN microdnf update -y \
    && microdnf install -y bash unzip tar gzip openssl findutils which ca-certificates \
    && microdnf clean all \
    && rm -rf /var/cache/dnf /var/cache/yum

RUN groupadd -g 1000 appuser \
    && useradd -u 1000 -g appuser -m -d /app -s /bin/bash appuser \
    && mkdir -p /app \
    && chown appuser:appuser /app

WORKDIR /app
USER appuser
CMD ["/bin/bash"]
