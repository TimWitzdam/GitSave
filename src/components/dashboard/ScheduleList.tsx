import React from "react";
import Schedule from "./Schedule";
import type { ScheduleWithHistory } from "../../types/scheduleTypes";
import EditSchedulePopup from "./EditSchedulePopup";
import BaseButton from "../BaseButton";

export default function ScheduleList() {
  const [schedules, setSchedules] = React.useState<ScheduleWithHistory[]>([
    {
      id: 1,
      name: "a",
      repository: "https://github.com/TimWitzdam/cryptodisplay-website",
      cron: "4 */1 * * *",
      username: "a",
      backupHistory: [
        {
          id: 81,
          backupJobId: 1,
          backupJob: {
            name: "asd",
          },
          timestamp: "2024-08-26T13:15:01.409Z",
          success: true,
          message: null,
        },
      ],
    },
  ]);
  const [loading, setLoading] = React.useState(false);
  const [editMenuDetails, setEditMenuDetails] = React.useState<{
    id: number;
    name: string;
    cron: string;
    repository: string;
  } | null>(null);
  const [showBackupNow, setShowBackupNow] = React.useState("");

  function loadSchedules() {
    fetch("/api/schedules", {
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          console.error("Failed to load schedules");
        }
      })
      .then((schedules) => {
        if (!schedules) return;
        setLoading(false);
        setSchedules(schedules);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  function backupNow(id: number) {
    fetch(`/api/schedules/${id}/backup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to backup schedule");
        }

        res.text().then((text) => setShowBackupNow(text));
      })
      .catch((error) => {
        console.error(error);
      });
  }

  React.useEffect(() => {
    loadSchedules();
    document.addEventListener("reloadSchedules", loadSchedules);
  }, []);

  function closeEditMenu() {
    setEditMenuDetails(null);
    location.reload();
  }

  return (
    <div
      className={`relative ${loading ? "h-[300px]" : "rounded-lg bg-bg-300 border border-border-200"}`}
    >
      {loading ? (
        <div className="absolute top-0 left-0 w-full rounded-lg bg-bg-300 border border-border-200 ">
          <div className="animate-[pulse_1s_cubic-bezier(0.4,0,0.6,1)_infinite]">
            {Array.from(Array(3).keys()).map((index) => (
              <div
                key={index}
                className={`${index !== 2 && "border-b border-border-200"} p-4`}
              >
                <div className="rounded-full bg-secondary bg-opacity-60 h-3 w-24 mb-4"></div>
                <div className="rounded-full bg-secondary bg-opacity-60 h-3 w-44 mb-4"></div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-secondary bg-opacity-60 h-3 w-3"></div>
                  <div className="rounded-full bg-secondary bg-opacity-60 h-3 w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        schedules.map((schedule, index) => (
          <Schedule
            key={schedule.id}
            name={schedule.name}
            link={schedule.repository}
            lastBackup={schedule.backupHistory[0]?.timestamp || "Never"}
            last={schedules.length - 1 === index}
            editClick={() =>
              setEditMenuDetails({
                id: schedule.id,
                name: schedule.name,
                cron: schedule.cron,
                repository: schedule.repository,
              })
            }
            backupNowClick={() => backupNow(schedule.id)}
          />
        ))
      )}
      {editMenuDetails && (
        <EditSchedulePopup
          id={editMenuDetails.id}
          name={editMenuDetails.name}
          cron={editMenuDetails.cron}
          repository={editMenuDetails.repository}
          closeEdit={closeEditMenu}
        />
      )}
      {showBackupNow && (
        <div className="p-4 fixed w-full h-full top-0 left-0 bg-black bg-opacity-50 grid place-content-center z-50">
          <div
            className={`rounded-lg bg-black border border-border-200 md:w-96`}
          >
            <h2 className="text-2xl font-medium p-4">Backup now</h2>
            <div className="bg-bg-200 p-4 border-y border-border-200">
              <span className="text-secondary">{showBackupNow}</span>
            </div>
            <div className="p-4">
              <BaseButton onClick={() => setShowBackupNow("")} fullWidth>
                Close
              </BaseButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
