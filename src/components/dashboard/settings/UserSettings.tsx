import BaseInput from "../../BaseInput";
import BaseButton from "../../BaseButton";
import React from "react";
import BaseSettingPanel from "./BaseSettingPanel";

export default function UserSettings() {
  const [username, setUsername] = React.useState("");
  const [usernameError, setUsernameError] = React.useState("");
  const [usernameSuccess, setUsernameSuccess] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const [passwordSuccess, setPasswordSuccess] = React.useState("");

  React.useEffect(() => {
    const username = localStorage.getItem("username") || "";
    setUsername(username);

    // In case username changed on a different device
    fetch("/api/user/name", {
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
      })
      .then((data) => {
        if (!data) return;

        localStorage.setItem("username", data.username);
        setUsername(data.username);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  function handleUsernameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUsernameError("");
    setUsernameSuccess("");

    fetch("/api/user/name", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          setUsernameError("An error occurred. Please check the server logs.");
        }
      })
      .then((data) => {
        if (!data) return;

        localStorage.setItem("username", data.username);
        setUsername(data.username);
        document.cookie = `auth_session=${data.token}; max-age=604800; path=/; SameSite=Strict`;
        setUsernameSuccess("Username updated successfully.");
      })
      .catch((err) => {
        console.error(err);
      });
  }

  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const password = data.password;
    const newPassword = data.newPassword;
    const confirmNewPassword = data.confirmNewPassword;
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    fetch("/api/user/password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password, newPassword }),
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          setPasswordError("An error occurred. Please check the server logs.");
        }
      })
      .then((data) => {
        if (!data) return;
        setPasswordSuccess("Password updated successfully.");
        form.reset();
      })
      .catch((err) => {
        console.error(err);
      });
  }

  return (
    <div className="grid gap-4">
      <BaseSettingPanel heading="Username">
        <form action="submit" onSubmit={handleUsernameSubmit}>
          <div className="mb-4">
            <BaseInput
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <BaseButton buttonType="submit">Save</BaseButton>
          {usernameError && <p className="text-red mt-2">{usernameError}</p>}
          {usernameSuccess && (
            <p className="text-green mt-2">{usernameSuccess}</p>
          )}
        </form>
      </BaseSettingPanel>

      <BaseSettingPanel heading="Password">
        <form action="submit" onSubmit={handlePasswordSubmit}>
          <div className="grid gap-3 mb-4">
            <BaseInput
              name="password"
              type="password"
              placeholder="Current password"
              required
            />
            <BaseInput
              name="newPassword"
              type="password"
              placeholder="New password"
              required
            />
            <BaseInput
              name="confirmNewPassword"
              type="password"
              placeholder="Confirm new password"
              required
            />
          </div>
          <BaseButton buttonType="submit">Update password</BaseButton>
          {passwordError && <p className="text-red mt-2">{passwordError}</p>}
          {passwordSuccess && (
            <p className="text-green mt-2">{passwordSuccess}</p>
          )}
        </form>
      </BaseSettingPanel>
    </div>
  );
}
