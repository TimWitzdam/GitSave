import React from "react";
import BaseInput from "../../BaseInput";
import BaseButton from "../../BaseButton";
import updateIfNotBelow from "../../../lib/updateIfNotBelow";

type Props = {
  id: number;
  name: string;
  closeEdit: () => void;
};

export default function EditAccessTokenPopup(props: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [name, setName] = React.useState(props.name);
  const [token, setToken] = React.useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const newToken = formData.get("token") as string;

    setLoading(true);
    fetch(`/api/access-tokens/${props.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, newToken }),
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
        location.reload();
      });
  }

  return (
    <div className="p-4 fixed w-full h-full top-0 left-0 bg-black bg-opacity-50 grid place-content-center z-50">
      <form
        onSubmit={handleSubmit}
        action="submit"
        className={`${success && "hidden"} rounded-lg bg-black border border-border-200 md:w-96`}
      >
        <h2 className="text-2xl font-medium p-4">Edit access token</h2>
        <div className="bg-bg-200 p-4 border-y border-border-200">
          <div className="flex flex-col gap-6">
            <BaseInput
              type="text"
              label="Name"
              placeholder="Enter token name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <div>
              <BaseInput
                type="text"
                label="Token value"
                placeholder="New token value"
                name="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <p className="text-secondary text-sm">
                Note: Changing the token value will delete the old value.
              </p>
            </div>
            <div>
              {error && <p className="text-red text-center mt-4">{error}</p>}
            </div>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between">
          <BaseButton
            id="cancel-edit"
            type="secondary"
            buttonType="reset"
            onClick={props.closeEdit}
          >
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
        <h2 className="text-2xl font-medium p-4">Access token edited</h2>
        <div className="bg-bg-200 p-4 border-t border-border-200">
          <p className="text-secondary mb-4">
            Your access token has been edited successfully.
          </p>
          <BaseButton fullWidth id="close-edit" onClick={props.closeEdit}>
            Close
          </BaseButton>
        </div>
      </div>
    </div>
  );
}
