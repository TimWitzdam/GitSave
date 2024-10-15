import BaseInput from "../../BaseInput";
import BaseButton from "../../BaseButton";
import React from "react";
import BaseSettingPanel from "./BaseSettingPanel";

export default function StorageSettings() {
  const [location, setLocation] = React.useState("local_folder");
  const [serverAddress, setServerAddress] = React.useState("");
  const [remoteLocation, setRemoteLocation] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [locationError, setLocationError] = React.useState("");
  const [locationSuccess, setLocationSuccess] = React.useState("");

  React.useEffect(() => {
    fetch("/api/config/storage", {
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

        setLocation(data.defaultLocation);
        setServerAddress(data.smbAddress);
        setRemoteLocation(data.smbLocation);
        setUsername(data.smbUsername);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  function handleDefaultLocationSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocationError("");
    setLocationSuccess("");

    fetch("/api/config/storage", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        location,
        serverAddress,
        remoteLocation,
        username,
        password,
      }),
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          setLocationError("An error occurred. Please check the server logs.");
        }
      })
      .then((data) => {
        if (!data) return;

        setLocationSuccess(data.message);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  return (
    <div className="grid gap-4">
      <BaseSettingPanel heading="Default location">
        <form action="submit" onSubmit={handleDefaultLocationSubmit}>
          <select
            name="location"
            className="mb-3 outline-none w-full rounded-lg bg-bg-300 border-2 border-border-200 py-3 px-4 text-secondary focus:border-border-100 transition-colors"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="local_folder">Local folder</option>
            <option value="smb_share">SMB share</option>
          </select>
          {location === "smb_share" && (
            <div className="grid gap-3 mb-4">
              <BaseInput
                type="text"
                placeholder="Server address with share (e.g. 192.168.1.1/backups)"
                value={serverAddress}
                onChange={(e) => setServerAddress(e.target.value)}
                required
              />
              <BaseInput
                type="text"
                placeholder="Remote location"
                value={remoteLocation}
                onChange={(e) => setRemoteLocation(e.target.value)}
                required
              />
              <BaseInput
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <div className="group relative">
                <BaseInput
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="hidden group-hover:block group-focus-within:block absolute -mt-10 top-0 left-0 bg-bg-100 rounded-xl p-3 z-10">
                  <p className="text-xs text-secondary">
                    <span className="text-orange">Warning: </span>Password will
                    be stored in plain text.
                  </p>
                </div>
              </div>
            </div>
          )}

          <BaseButton buttonType="submit">Save</BaseButton>
          {locationError && <p className="text-red mt-2">{locationError}</p>}
          {locationSuccess && (
            <p className="text-green mt-2">{locationSuccess}</p>
          )}
        </form>
      </BaseSettingPanel>
    </div>
  );
}
