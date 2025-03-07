<div align="center">
    <img src="https://i.imgur.com/LIcWf9r.png" alt="GitSave Logo" />
    <h1 align="center">GitSave</a></h1>
    <p align="center">Easily back up your Git repositories on a schedule.</p>
    <br />
</div>

![GitSave 3 pages animation](https://i.imgur.com/i0SNNiL.gif)

https://github.com/user-attachments/assets/301b28ca-6b72-490a-8efb-217e39fb73d3

# Git happens...

So be prepared and keep backups of your own and favourite Git repositories.

## 🛠️ Features

- Easy to use and responsive web interface
- Automated install using Docker
- Scheduling of backups
- Support for GitHub, GitLab and other Git platforms
- Support for own authentication provider
- Pause/resume schedules
- View backup history
- Support for backing up to a SMB share

## 🚀 Deploy GitSave for yourself

> [!WARNING]
> Make sure to change the env variables "JWT_SECRET" and "ENCRYPTION_SECRET" to something secure. [This website](https://jwtsecret.com/) may help you with that.
> The ENCRYPTION_SECRET must be 32 characters long.

### Single run command

```bash
docker run -d --restart=always -p 3000:3000 -v gitsave:/app/data -v ./backups:/app/backups -e JWT_SECRET={YOUR_SECRET_HERE} -e ENCRYPTION_SECRET={YOUR_SECRET_HERE_32_CHARACTERS} -e DISABLE_AUTH=false --name GitSave timwitzdam/gitsave:latest
```

### Docker compose

1. Create .env file

```bash
# You can generate a JWT_SECRET here: https://jwtsecret.com/
JWT_SECRET="REPLACE_THIS"
DISABLE_AUTH=false
ENCRYPTION_SECRET="REPLACE_THIS_WITH_32_CHARACTERS_SECRET"
```

2. Create `docker-compose.yml` file

```yaml
services:
  gitsave:
    image: timwitzdam/gitsave:latest
    container_name: GitSave
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - gitsave:/app/data
      - ./backups:/app/backups
    environment:
      - JWT_SECRET=${JWT_SECRET:?error}
      - DISABLE_AUTH=${DISABLE_AUTH:?error}
      - ENCRYPTION_SECRET=${ENCRYPTION_SECRET:?error}

volumes:
  gitsave:
```

## 👀 Any questions, suggestions or problems?

You're welcome to contribute to GitSave or open an issue if you have any suggestions or find any problems.

I'm also available via mail: [contact@witzdam.com](mailto:contact@witzdam.com)
