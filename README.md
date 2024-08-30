<div align="center">
    <img src="https://i.imgur.com/kiMG6EJ.png" alt="GitSave Logo" height="250" />
    <h1 align="center">GitSave</a></h1>
    <p align="center">Easily back up your Git repositories on a schedule.</p>
    <br />
</div>

<img src="https://i.imgur.com/i0SNNiL.gif" />

# Git happens...
So be prepared and keep backups of your own and favourite Git repositories.

## 🛠️ Features
- Easy to use and responsive web interface
- Automated install using Docker
- Scheduling of backups
- Support for GitHub, GitLab and other Git platforms
- Pause/resume schedules
- View backup history

## 🚀 Deploy GitSave for yourself
> [!WARNING]
> Make sure to change the env variable "JWT_SECRET" to something secure. [This website](https://jwtsecret.com/) may help you with that
```bash
docker run -d --restart=always -p 3000:3000 -v gitsave:/app/data -v ./backups:/app/backups -e JWT_SECRET={YOUR_SECRET_HERE} --name GitSave timwitzdam/gitsave
```

## 👀 Any questions, suggestions or problems?
You're welcome to contribute to GitSave or open an issue if you have any suggestions or find any problems.

I'm also available via mail: [contact@witzdam.com](mailto:contact@witzdam.com)
