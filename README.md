# 13 SYSTEM
 
Hi, I'm Urfan (13). I study Electrical and Electronics Engineering and I'm teaching myself embedded systems and robotics by building things. This repo is my portfolio.
 
▶ **Play it:** https://urfan-zeynalov.github.io/REPO-NAME/
 
I didn't want just another list of projects, so I turned my portfolio into a made-up retro game console. You turn it on, choose one of my projects on the select screen and play a short game about how it works. To win the round, you have to use the same idea the hardware relies on.
 
Each project also has a case study where I go through the parts I used, why I made the decisions I did, what broke and what I learned. I keep a build log for whatever I'm working on right now.
 
## How I built it
 
- **Vanilla JS + Canvas.** I didn't use a game engine or a framework. The console (boot sequence, select screen, loader, input and sound) is a handful of small modules I wrote.
- **One game per project.** Each game is its own module and loads only when you pick it, so the first load stays small.
- **Data-driven pages.** My projects, case studies and build log are plain JS data and Markdown, and the pages are generated from them at build time.
- **Vite + GitHub Actions.** Every push to `main` builds the site and deploys it to GitHub Pages.
## Run it locally
 
```bash
npm install
npm run dev
```
 
## Find me
 
- GitHub: [urfan-zeynalov](https://github.com/urfan-zeynalov)
- LinkedIn: [urfan-zeynalov](https://www.linkedin.com/in/urfan-zeynalov)
