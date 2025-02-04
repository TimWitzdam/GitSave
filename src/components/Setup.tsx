import React from "react";
import BaseButton from "./BaseButton";
import BaseInput from "./BaseInput";

export default function Setup() {
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [step, setStep] = React.useState(0);
  const [every, setEvery] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [showAddAccessToken, setShowAddAccessToken] = React.useState(false);
  const [privateRepo, setPrivateRepo] = React.useState(false);
  const [accessToken, setAccessToken] = React.useState("default");
  const [availableAccessTokens, setAvailableAccessTokens] = React.useState<
    { id: number; name: string }[]
  >([]);

  function updateEvery(e: React.ChangeEvent<HTMLInputElement>) {
    if (parseInt(e.target.value) < 1) {
      setEvery(1);
      return;
    }

    setEvery(parseInt(e.target.value));
  }

  function handleRegisterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const username = data.username;
    const password = data.password;
    const confirmPassword = data.confirmPassword;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => {
        setLoading(false);
        if (res.ok) {
          return res.json();
        } else {
          res.text().then((errorMessage) => setError(errorMessage));
        }
      })
      .then((data) => {
        if (!data) return;
        document.cookie = `auth_session=${data.token}; max-age=604800; path=/; SameSite=Strict`;
        setSuccess("Registered successfully. Onto step 2...");
        setTimeout(() => {
          setStep(2);
          setSuccess("");
        }, 2000);
      })
      .catch((err) => {
        setError("An error occurred. Please try again.");
      });
  }

  function handleMonitorSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const repository = formData.get("repository") as string;
    const every = parseInt(formData.get("every") as string);
    const timespan = formData.get("timespan") as string;
    const privateRepo = formData.get("private") as string;
    const accessTokenId = formData.get("access-token") as string;

    setLoading(true);
    fetch("/api/schedules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        repository,
        every,
        timespan,
        private: privateRepo,
        accessTokenId,
      }),
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          res.text().then((errorMessage) => setError(errorMessage));
        }
      })
      .then((data) => {
        setLoading(false);
        if (!data) return;
        setSuccess(
          "Schedule created successfully. Redirecting to dashboard...",
        );
        setTimeout(() => {
          setSuccess("");
          location.href = "/dashboard";
        }, 2000);
      });
  }

  function updateAccessToken(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === "new") {
      setShowAddAccessToken(true);
      return;
    }
    setAccessToken(e.target.value);
  }

  function handleAccessTokenSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("access-token-name") as string;
    const token = formData.get("access-token") as string;

    fetch("/api/access-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, token }),
    }).then(() => {
      form.reset();
      setShowAddAccessToken(false);
      fetchAccessTokens();
    });
  }

  function fetchAccessTokens() {
    fetch("/api/access-tokens")
      .then((res) => res.json())
      .then((data) => setAvailableAccessTokens(data));
  }

  return (
    <div>
      {step === 0 && (
        <div>
          <h1 className="text-center font-medium text-2xl mb-6">
            Welcome to GitSave
          </h1>
          <p className="text-secondary mb-6 text-center">
            Let's get you started with a quick 2 step initial setup
          </p>
          <BaseButton onClick={() => setStep(1)} fullWidth>
            Get started
          </BaseButton>
        </div>
      )}
      {step === 1 && (
        <div>
          <h1 className="text-center font-medium text-2xl mb-6">
            1. Account creation
          </h1>
          <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
            <BaseInput
              type="text"
              name="username"
              placeholder="Username"
              required
            />
            <BaseInput
              type="password"
              name="password"
              placeholder="Password"
              required
            />
            <BaseInput
              type="password"
              name="confirmPassword"
              placeholder="Confirm password"
              required
            />
            <BaseButton buttonType="submit">
              <div className="flex items-center justify-center gap-2">
                {loading && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 -960 960 960"
                    width="24px"
                    fill="#e8eaed"
                    className="animate-spin"
                  >
                    <path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q17 0 28.5 11.5T520-840q0 17-11.5 28.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160q133 0 226.5-93.5T800-480q0-17 11.5-28.5T840-520q17 0 28.5 11.5T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Z" />
                  </svg>
                )}
                <span>Create account</span>
              </div>
            </BaseButton>
          </form>
        </div>
      )}
      {step === 2 && (
        <div>
          <div className={`${showAddAccessToken && "hidden"}`}>
            <h1 className="text-center font-medium text-2xl mb-6">
              2. Adding first schedule
            </h1>
            <div className="w-fit ml-auto mb-6">
              <BaseButton
                type="secondary"
                onClick={() => (location.href = "/dashboard")}
              >
                Skip for now
              </BaseButton>
            </div>
            <form onSubmit={handleMonitorSubmit} action="submit">
              <div className="flex flex-col gap-6">
                <BaseInput
                  type="text"
                  label="Name"
                  placeholder="Enter schedule name"
                  name="name"
                  required
                />
                <div>
                  <span className="text-secondary">Repository</span>
                  <div className="mt-2">
                    <BaseInput
                      type="url"
                      placeholder="https://github.com/exampleuser/examplerepo.git"
                      name="repository"
                      required
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-2 rounded-lg bg-bg-300 border-2 border-border-200 text-center py-3 px-4 text-secondary">
                        <label htmlFor="private">Private?</label>
                        <input
                          type="checkbox"
                          name="private"
                          id="private"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setPrivateRepo(e.target.checked)
                          }
                        />
                      </div>
                      {privateRepo && (
                        <select
                          name="access-token"
                          onChange={updateAccessToken}
                          value={accessToken}
                          className="outline-none w-full rounded-lg bg-bg-300 border-2 border-border-200 py-3 px-4 text-secondary focus:border-border-100 transition-colors"
                        >
                          <option disabled value="default">
                            Select an option
                          </option>
                          {availableAccessTokens.map((token) => (
                            <option key={token.id} value={token.id}>
                              {token.name}
                            </option>
                          ))}
                          <option value="new">+ Add new access token</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-secondary">Backup routine</label>
                  <div className="flex flex-col gap-2 mt-2 sm:flex-row sm:items-center ">
                    <div className="rounded-lg bg-bg-300 border-2 border-border-200 text-center py-3 px-4 text-secondary cursor-not-allowed">
                      Every
                    </div>
                    <div className="w-fit">
                      <BaseInput
                        type="number"
                        value={every}
                        name="every"
                        onChange={updateEvery}
                        width="sm:w-24"
                        required
                      />
                    </div>
                    <select
                      name="timespan"
                      className="outline-none w-full rounded-lg bg-bg-300 border-2 border-border-200 text-center py-3 px-4 text-secondary focus:border-border-100 transition-colors"
                    >
                      <option value="minutes">
                        Minute{every === 0 || every > 1 ? "s" : ""}
                      </option>
                      <option value="hours">
                        Hour{every === 0 || every > 1 ? "s" : ""}
                      </option>
                      <option value="days">
                        Day{every === 0 || every > 1 ? "s" : ""}
                      </option>
                    </select>
                  </div>
                </div>
                <BaseButton buttonType="submit">
                  <div className="flex items-center justify-center gap-2">
                    {loading && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="24px"
                        viewBox="0 -960 960 960"
                        width="24px"
                        fill="#e8eaed"
                        className="animate-spin"
                      >
                        <path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q17 0 28.5 11.5T520-840q0 17-11.5 28.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160q133 0 226.5-93.5T800-480q0-17 11.5-28.5T840-520q17 0 28.5 11.5T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Z" />
                      </svg>
                    )}
                    <span>Create schedule</span>
                  </div>
                </BaseButton>
              </div>
            </form>
          </div>
          <div className={`${!showAddAccessToken && "hidden"}`}>
            <h2 className="text-2xl font-medium mb-4">Add access token</h2>
            <form action="submit" onSubmit={handleAccessTokenSubmit}>
              <div className="flex flex-col gap-6">
                <a
                  className="text-secondary underline hover:text-white transition-colors"
                  href="https://github.com/TimWitzdam/GitSave/wiki/How-to-create-a-GitHub-access-token"
                  target="_blank"
                >
                  How to create a GitHub access token
                </a>
                <BaseInput
                  type="text"
                  label="Name"
                  placeholder="Enter access token name"
                  name="access-token-name"
                  required
                />
                <BaseInput
                  type="password"
                  label="Token"
                  placeholder="Enter access token"
                  name="access-token"
                  required
                />
              </div>
              <div className="mt-6 flex items-center justify-between gap-2">
                <BaseButton
                  type="secondary"
                  buttonType="reset"
                  onClick={() => setShowAddAccessToken(false)}
                >
                  Go back
                </BaseButton>
                <BaseButton buttonType="submit">Add access token</BaseButton>
              </div>
            </form>
          </div>
        </div>
      )}
      {error && <p className="text-red text-center mt-4">{error}</p>}
      {success && <p className="text-green text-center mt-4">{success}</p>}
    </div>
  );
}
