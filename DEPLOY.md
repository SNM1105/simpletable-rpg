# Deploy to GitHub and Vercel

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `simpletable-rpg` (or your preferred name)
3. Make it **Public** or **Private** (your choice)
4. **Do NOT** initialize with README, .gitignore, or license
5. Click "Create repository"

## Step 2: Push Code to GitHub

After creating the repository, GitHub will show you commands. Use these:

```powershell
# Add your GitHub repository as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/simpletable-rpg.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

### Option A: Using Vercel Dashboard (Recommended)

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your `simpletable-rpg` repository
5. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
6. Add Environment Variable (if needed for Ollama):
   - Key: `OLLAMA_URL`
   - Value: Your Ollama API URL (e.g., `http://localhost:11434`)
7. Click "Deploy"

### Option B: Using Vercel CLI

```powershell
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

## Important Notes

### Ollama Requirement

This app requires Ollama to be running. For deployment:

**Local Development:**

- Ollama runs on your machine at `http://localhost:11434`

**Production Deployment:**
You have two options:

1. **Self-hosted Ollama** (Recommended for demo):

   - Deploy Ollama on a server with a public URL
   - Set `OLLAMA_URL` environment variable in Vercel
   - Update `src/lib/aiDm/ollamaClient.ts` to use `process.env.OLLAMA_URL`

2. **ngrok Tunnel** (Quick demo):

   ```powershell
   # Run ngrok to expose local Ollama
   ngrok http 11434
   ```

   - Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Add as `OLLAMA_URL` environment variable in Vercel
   - **Note**: ngrok URLs change each time, not suitable for permanent hosting

3. **Alternative AI Provider**:
   - Replace Ollama with OpenAI, Anthropic, or other API
   - Update `src/lib/aiDm/ollamaClient.ts` accordingly

### Multiplayer Limitations

- Current implementation uses **in-memory storage**
- Lobbies will reset when server restarts
- For production, consider:
  - PostgreSQL (Vercel Postgres)
  - Redis (Upstash)
  - Firebase Realtime Database
  - Add WebSocket support for real-time sync

## Testing Your Deployment

1. After deployment, Vercel will provide a URL (e.g., `https://simpletable-rpg.vercel.app`)
2. Share this URL with friends to test multiplayer
3. Make sure Ollama is accessible if you're using ngrok

## Updating Your Deployment

```powershell
# Make changes to your code
git add .
git commit -m "Your changes"
git push

# Vercel will automatically redeploy
```
