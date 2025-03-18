import React from "react";
import BaseInput from "../BaseInput";
import BaseButton from "../BaseButton";
import updateIfNotBelow from "../../lib/updateIfNotBelow";

export default function AddSchedulePopup() {
  const [every, setEvery] = React.useState(1);
  const [keepLast, setKeepLast] = React.useState(5);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [showAddAccessToken, setShowAddAccessToken] = React.useState(false);
  const [privateRepo, setPrivateRepo] = React.useState(false);
  const [accessToken, setAccessToken] = React.useState("default");
  const [availableAccessTokens, setAvailableAccessTokens] = React.useState<
    { id: number; name: string }[]
  >([]);

  function updateAccessToken(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === "new") {
      setShowAddAccessToken(true);
      return;
    }
    setAccessToken(e.target.value);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const repository = formData.get("repository") as string;
    const every = parseInt(formData.get("every") as string);
    const timespan = formData.get("timespan") as string;
    const privateRepo = formData.get("private") as string;
    const accessTokenId = formData.get("access-token") as string;
    const keepLast = formData.get("keep-last") as string;

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
        keepLast: parseInt(keepLast),
      }),
    })
      .then((res) => {
        if (res.ok) {
          form.reset();
          return res.json();
        } else {
          res.text().then((errorMessage) => setError(errorMessage));
        }
      })
      .then((data) => {
        setLoading(false);
        if (!data) return;
        setSuccess(true);
      });
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

  React.useEffect(() => {
    fetchAccessTokens();
  }, []);

  return (
    <div
      id="add-schedule"
      className="p-4 opacity-0 pointer-events-none fixed w-full h-full top-0 left-0 bg-black bg-opacity-50 grid place-content-center transition-opacity duration-300 z-50"
    >
      <form
        onSubmit={handleSubmit}
        action="submit"
        className={`${(success || showAddAccessToken) && "hidden"} rounded-lg bg-black border border-border-200 md:w-96`}
      >
        <h2 className="text-2xl font-medium p-4">Add schedule</h2>
        <div className="bg-bg-200 p-4 border-y border-border-200">
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
                    onChange={(e) => updateIfNotBelow(e, setEvery)}
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
            <div>
              <label className="text-secondary">Settings</label>
              <div className="flex flex-col gap-2 mt-2 sm:flex-row sm:items-center ">
                <div className="shrink-0 rounded-lg bg-bg-300 border-2 border-border-200 text-center py-3 px-4 text-secondary cursor-not-allowed">
                  Keep last
                </div>
                <div className="w-fit">
                  <BaseInput
                    type="number"
                    value={keepLast}
                    name="keep-last"
                    onChange={(e) => updateIfNotBelow(e, setKeepLast, 5)}
                    required
                  />
                </div>
                <div className="rounded-lg bg-bg-300 border-2 border-border-200 text-center py-3 px-4 text-secondary cursor-not-allowed">
                  backup{keepLast === 0 || keepLast > 1 ? "s" : ""}
                </div>
              </div>
              {error && <p className="text-red text-center mt-4">{error}</p>}
            </div>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between">
          <BaseButton id="cancel-add" type="secondary" buttonType="reset">
            Cancel
          </BaseButton>
          <BaseButton buttonType="submit">
            <div className="flex items-center gap-2">
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
              <span>Save</span>
            </div>
          </BaseButton>
        </div>
      </form>
      <div
        className={`${!success && "hidden"} rounded-lg bg-black border border-border-200`}
      >
        <h2 className="text-2xl font-medium p-4">Schedule added</h2>
        <div className="bg-bg-200 p-4 border-t border-border-200">
          <p className="text-secondary mb-4">
            Your schedule has been added successfully.
          </p>
          <BaseButton fullWidth id="close-add">
            Close
          </BaseButton>
        </div>
      </div>
      <div
        className={`${!showAddAccessToken && "hidden"} rounded-lg bg-black border border-border-200`}
      >
        <h2 className="text-2xl font-medium p-4">Add access token</h2>
        <form action="submit" onSubmit={handleAccessTokenSubmit}>
          <div className="bg-bg-200 p-4 border-t border-border-200 flex flex-col gap-6">
            <a
              className="text-secondary underline hover:text-white transition-colors"
              href="https://witzdam.com/docs/gitsave/how-to-create-a-github-access-token"
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
          <div className="p-4 flex items-center justify-between">
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
  );
}
