# Deployment — feenyPowerLanding

How to keep **local development** and the **production server** in sync.

There is no automated deploy pipeline. GitHub is the source of truth; the server only pulls.

---

## Architecture

```
┌─────────────────┐     git push      ┌──────────────────────────┐
│  Local Mac      │ ────────────────► │  GitHub (master)         │
│  feenyPowerLanding                   │  acomputeradrift/...     │
└─────────────────┘                   └────────────┬─────────────┘
        │                                          │
        │  node fpc_server.js                      │  git pull
        │  localhost:3000                          ▼
        │                               ┌──────────────────────────┐
        │                               │  Ubuntu server (DO)      │
        │                               │  /root/feenyPowerLanding │
        │                               │  PM2: "FPC Website"      │
        └─ test before push ───────────►│  feenypowerandcontrol.com│
                                        └──────────────────────────┘
```

---

## Environments

| | Local | Production |
|---|--------|------------|
| **Machine** | Jamie's Mac | DigitalOcean droplet `fpcwebsite-sfo3` |
| **Repo path** | `~/Development (Not Shared)/feenyPowerLanding` | `/root/feenyPowerLanding` |
| **Branch** | `master` | `master` |
| **Start command** | `cd backend && node fpc_server.js` | PM2 manages Node |
| **URL** | http://localhost:3000 | https://www.feenypowerandcontrol.com |
| **Env file** | `backend/.env` (local, gitignored) | `backend/.env` (server, gitignored) |

Local and server each have their own `.env`. They are **not synced via git**. If a change requires new env vars, update both places manually.

---

## SSH access

Jamie's Mac has an SSH config entry at `~/.ssh/config`:

```
Host my-do-server
  HostName 161.35.236.81
  User root
  IdentityFile ~/.ssh/id_ed25519
  ...
```

Connect:

```bash
ssh my-do-server
```

Optional alias: add `feenyPowerLanding` to the `Host` line so `ssh feenyPowerLanding` also works.

---

## Standard deploy workflow

Use this every time you ship changes to the live site.

### 1. Develop and test locally

```bash
cd "/Users/jamiefeeny/Development (Not Shared)/feenyPowerLanding/backend"
node fpc_server.js
```

Verify affected pages in the browser (e.g. http://localhost:3000/faq).

Stop the local server with `Ctrl+C` when done.

### 2. Commit and push (local Mac)

Only when Jamie (or the task) explicitly asks to commit:

```bash
cd "/Users/jamiefeeny/Development (Not Shared)/feenyPowerLanding"
git status
git add <files>
git commit -m "Your message"
git push origin master
```

### 3. Pull on the server

```bash
ssh my-do-server
cd /root/feenyPowerLanding
git pull origin master
```

Expected output: fast-forward merge from `origin/master`.

### 4. Restart Node via PM2

The PM2 process is named **`FPC Website`**, not `fpc_server`:

```bash
pm2 restart "FPC Website"
```

Or by id (usually `0`):

```bash
pm2 restart 0
```

Check status:

```bash
pm2 list
pm2 logs "FPC Website" --lines 30
```

### 5. Verify production

```bash
curl -I https://www.feenypowerandcontrol.com/faq
curl -I https://www.feenypowerandcontrol.com/consultation
```

Look for `HTTP/2 200` or `HTTP/1.1 200`. Then spot-check in a browser:

- Page renders correctly
- Calendly buttons open popup
- Any new routes respond (not 404)

---

## One-liner deploy (after push)

From the server, after SSH in:

```bash
cd /root/feenyPowerLanding && git pull origin master && pm2 restart "FPC Website"
```

---

## What gets deployed vs what stays local

| In git (deployed via pull) | Not in git (stays on each machine) |
|----------------------------|-------------------------------------|
| `frontend/**` | `backend/.env` |
| `backend/fpc_server.js` | `backend/uploads/` (uploaded log files) |
| `backend/routes/**` | PM2 runtime state |
| `backend/models/**` | MongoDB data |
| `backend/RTI_log_analysis/**` | |
| `backend/package.json` | |

After pulling code that changes `backend/package.json`:

```bash
cd /root/feenyPowerLanding/backend
npm install
pm2 restart "FPC Website"
```

---

## Adding a new public page

Every new HTML page needs **both** a file and a route before deploy:

1. Add `frontend/your-page.html` (use site-root paths — see `development_continuity.md`).
2. Add route in `backend/fpc_server.js`:

   ```javascript
   app.get('/your-path', (req, res) => {
       res.sendFile(path.join(__dirname, '../frontend/your-page.html'));
   });
   ```

3. Test locally → commit → push → pull on server → `pm2 restart "FPC Website"`.

---

## Troubleshooting

### `pm2 restart fpc_server` → Process not found

Use the actual process name:

```bash
pm2 list
pm2 restart "FPC Website"
```

### Page returns 404 after deploy

- Confirm `git pull` brought in the new commit (`git log -1`).
- Confirm `fpc_server.js` has the route.
- Restart PM2 — Express only loads route changes on restart.

### Styles or scripts missing

- HTML must use `/styles/...` and `/scripts/...` (leading slash).
- Static mounts are defined in `fpc_server.js`; no nginx config change needed for normal asset paths.

### MongoDB connection errors in PM2 logs

RTI diagnostics APIs need MongoDB. Marketing pages (consultation, FAQ) still serve without it.

- Check `backend/.env` on the server for `MONGO_URI`.
- Restart after env changes: `pm2 restart "FPC Website" --update-env`

### Local works, production shows old content

- Server may not have pulled: `cd /root/feenyPowerLanding && git log -1`
- PM2 may not have restarted after pull.
- Hard-refresh browser or test with `curl -I` to bypass cache.

### Git pull conflicts on server

Rare if only Jamie deploys from `master`. If it happens:

```bash
git status
git stash          # if server has accidental local edits
git pull origin master
```

Avoid editing files directly on the server; always change locally and push.

---

## Rollback

If a deploy breaks production:

```bash
cd /root/feenyPowerLanding
git log --oneline -5          # find last good commit
git checkout <commit-hash>    # temporary detach — or revert on master locally and push
pm2 restart "FPC Website"
```

Preferred rollback: revert the bad commit on `master` locally, push, then pull on server. Avoid force-push unless Jamie explicitly requests it.

---

## Checklist (copy for each deploy)

- [ ] Tested locally at http://localhost:3000
- [ ] Committed and pushed to `origin/master`
- [ ] SSH: `cd /root/feenyPowerLanding && git pull origin master`
- [ ] `npm install` (only if `package.json` changed)
- [ ] `pm2 restart "FPC Website"`
- [ ] `curl -I` or browser check on affected URLs
- [ ] Update **Recent changes log** in `development_continuity.md` if significant
