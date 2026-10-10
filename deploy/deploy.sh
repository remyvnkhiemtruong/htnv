#!/usr/bin/env bash
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo 'Run this deployment as root.' >&2; exit 1; fi
exec 9>/run/htnv-deploy.lock
flock -n 9 || { echo "Another HTNV deployment is running." >&2; exit 1; }
export PATH=/opt/htnv-node/current/bin:$PATH
cd /root/HTNV/htnv
npm ci
npm run build:vps
release="/srv/htnv/releases/$(date -u +%Y%m%dT%H%M%SZ)"
previous="$(readlink -f /srv/htnv/current || true)"
env_backup="/root/htnv-setup-backups/env-$(date -u +%Y%m%dT%H%M%SZ).backup"
install -m 600 /etc/htnv.env "$env_backup"
install -d -m 755 "$release"
tar -cf - dist server server-dist node_modules package.json | tar -xf - -C "$release"
chown -R root:root "$release"
chmod -R go-w "$release"
# Keep the running version available for rollback.
ln -s "$release" /srv/htnv/current.next
mv -Tf /srv/htnv/current.next /srv/htnv/current
python3 - <<'PY'
from pathlib import Path
import subprocess
f=Path('/etc/htnv.env')
lines=[line for line in f.read_text().splitlines() if not line.startswith(('APP_GIT_COMMIT_SHA=','APP_GIT_COMMIT_REF='))]
for key,args in [('APP_GIT_COMMIT_SHA',['git','rev-parse','HEAD']),('APP_GIT_COMMIT_REF',['git','branch','--show-current'])]:
    lines.append(key+'='+subprocess.check_output(args,text=True).strip())
f.write_text('\n'.join(lines)+'\n')
f.chmod(0o600)
PY
systemctl restart htnv || true
for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl --fail --silent http://127.0.0.1:3000/api/health >/dev/null; then
        if ! BASE_URL=${BASE_URL:-https://htnv.io.vn} REQUIRE_DEDICATED_JWT_SECRET=true EXPECTED_GIT_SHA=$(git rev-parse HEAD) npm run smoke:production; then break; fi
        printf 'Deployed: %s\n' "$release"
        exit 0
    fi
    sleep 2
done
if [[ -n "$previous" && -d "$previous" ]]; then
    ln -s "$previous" /srv/htnv/current.next
    mv -Tf /srv/htnv/current.next /srv/htnv/current
    install -m 600 "$env_backup" /etc/htnv.env
    systemctl restart htnv
fi
echo 'Deployment health check failed; previous release restored when available.' >&2
exit 1
