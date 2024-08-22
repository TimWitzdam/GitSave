import React from "react";
import BaseButton from "../BaseButton";
import BaseInput from "../BaseInput";

export default function LoginForm() {
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const username = data.username;
    const password = data.password;

    fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else if (res.status === 401) {
          setError("Invalid username or password");
        } else {
          setError("An error occurred. Please try again.");
        }
      })
      .then((data) => {
        if (!data) return;
        document.cookie = `auth_session=${data.token}; max-age=604800; path=/`;
        setSuccess("Logged in successfully. Redirecting...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      })
      .catch((err) => {
        setError("An error occurred. Please try again.");
      });
  }

  return (
    <div>
      <form
        onSubmit={handleLoginSubmit}
        id="login"
        className="flex flex-col gap-4"
      >
        <BaseInput type="text" name="username" placeholder="Username" />
        <BaseInput type="password" name="password" placeholder="Password" />
        <a className="text-secondary opacity-60 hover:opacity-100 transition-opacity">
          Forgot password?
        </a>
        <BaseButton>Sign in</BaseButton>
      </form>
      {error && <p className="text-red text-center mt-4">{error}</p>}
      {success && <p className="text-green text-center mt-4">{success}</p>}
    </div>
  );
}
