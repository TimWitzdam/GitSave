import BaseButton from "../../BaseButton";
import React, { useEffect } from "react";
import BaseSettingPanel from "./BaseSettingPanel";
import AccessToken from "./AccessToken";
import EditAccessTokenPopup from "./EditAccessTokenPopup";

export default function AccessTokensSettings() {
  const [editMenu, setEditMenu] = React.useState<{
    id: number;
    name: string;
  } | null>(null);
  const [tokens, setTokens] = React.useState<{ name: string; id: number }[]>(
    [],
  );
  const [deleteMenu, setDeleteMenu] = React.useState<number | null>(null);

  useEffect(() => {
    fetch("/api/access-tokens", {
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          console.error("Failed to load access tokens");
        }
      })
      .then((data) => {
        if (!data) return;
        setTokens(data);
      });
  }, []);

  function handleDeleteClick(id: number) {
    fetch(`/api/access-tokens/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    }).then((res) => {
      setDeleteMenu(null);
      location.reload();
    });
  }

  return (
    <div className="grid gap-4">
      <BaseSettingPanel heading="Access tokens">
        <div className="grid gap-2">
          {tokens.map((token) => (
            <AccessToken
              id={token.id}
              name={token.name}
              editClick={() => setEditMenu(token)}
              deleteClick={() => setDeleteMenu(token.id)}
            />
          ))}
          {tokens.length === 0 && (
            <div className="text-secondary">No access tokens found</div>
          )}
        </div>
        {editMenu && (
          <EditAccessTokenPopup
            id={editMenu.id}
            name={editMenu.name}
            closeEdit={() => setEditMenu(null)}
          />
        )}
        {deleteMenu && (
          <div className="p-4 fixed w-full h-full top-0 left-0 bg-black bg-opacity-50 grid place-content-center z-50">
            <div
              className={`rounded-lg bg-black border border-border-200 md:w-96`}
            >
              <h2 className="text-2xl font-medium p-4">Delete access token</h2>
              <div className="text-secondary bg-bg-200 p-4 border-y border-border-200">
                <p>All schedules using this token will stop working.</p>
                <br />
                <p>Are you sure you want to delete this access token?</p>
              </div>
              <div className="p-4 flex items-center gap-4">
                <BaseButton
                  type="secondary"
                  onClick={() => setDeleteMenu(null)}
                  fullWidth
                >
                  Cancel
                </BaseButton>
                <BaseButton
                  onClick={() => handleDeleteClick(deleteMenu)}
                  fullWidth
                >
                  Delete
                </BaseButton>
              </div>
            </div>
          </div>
        )}
      </BaseSettingPanel>
    </div>
  );
}
