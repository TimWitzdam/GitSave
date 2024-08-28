import React from "react";
import BaseInput from "../BaseInput";
import BaseButton from "../BaseButton";

export default function AddSchedulePopup() {
  const [every, setEvery] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  function updateEvery(e: React.ChangeEvent<HTMLInputElement>) {
    if (parseInt(e.target.value) < 1) {
      setEvery(1);
      return;
    }

    setEvery(parseInt(e.target.value));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const repository = formData.get("repository") as string;
    const every = parseInt(formData.get("every") as string);
    const timespan = formData.get("timespan") as string;

    setLoading(true);
    fetch("/api/schedules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, repository, every, timespan }),
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
        setSuccess(true);
      });
  }

  return (
    <div
      id="add-schedule"
      className="p-4 opacity-0 pointer-events-none fixed w-full h-full top-0 left-0 bg-black bg-opacity-50 grid place-content-center transition-opacity duration-300 z-50"
    >
      <form
        onSubmit={handleSubmit}
        action="submit"
        className={`${success && "hidden"} rounded-lg bg-black border border-border-200 md:w-96`}
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
            <BaseInput
              type="url"
              label="Repository link"
              placeholder="https://github.com/exampleuser/examplerepo.git"
              name="repository"
              required
            />
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
    </div>
  );
}
