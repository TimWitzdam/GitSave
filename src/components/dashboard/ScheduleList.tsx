import React from "react";
import Schedule from "./Schedule";
import type { ScheduleWithHistory } from "../../types/scheduleTypes";
import EditSchedulePopup from "./EditSchedulePopup";
import BaseButton from "../BaseButton";
import { formatTimestamp } from "../../lib/formatTimestamp";

export default function ScheduleList() {
  const [schedules, setSchedules] = React.useState<ScheduleWithHistory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editMenuDetails, setEditMenuDetails] = React.useState<{
    id: number;
    name: string;
    cron: string;
    repository: string;
  } | null>(null);
  const [showBackupNow, setShowBackupNow] = React.useState("");
  const [showDelete, setShowDelete] = React.useState<number | null>(null);

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

  function handlePauseClick(id: number, paused: boolean) {
    fetch(`/api/schedules/${id}/${paused ? "resume" : "pause"}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to pause/resume schedule");
        }

        loadSchedules();
      })
      .catch((error) => {
        console.error(error);
      });
  }

  function handleDeleteClick(id: number) {
    fetch(`/api/schedules/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to delete schedule");
        }

        setShowDelete(null);
        loadSchedules();
      })
      .catch((error) => {
        setShowDelete(null);
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
      ) : schedules.length === 0 ? (
        <div className="p-4">
          <p className="text-secondary">
            You don't have any schedules yet. Create one by clicking the button
            on the top right.
          </p>
        </div>
      ) : (
        schedules.map((schedule, index) => (
          <Schedule
            key={schedule.id}
            name={schedule.name}
            link={schedule.repository}
            paused={schedule.paused}
            lastBackup={
              (schedule.backupHistory[0]?.timestamp &&
                formatTimestamp(schedule.backupHistory[0]?.timestamp)) ||
              "Never"
            }
            last={schedules.length - 1 === index}
            success={schedule.backupHistory[0]?.success}
            editClick={() =>
              setEditMenuDetails({
                id: schedule.id,
                name: schedule.name,
                cron: schedule.cron,
                repository: schedule.repository,
              })
            }
            backupNowClick={() => backupNow(schedule.id)}
            pauseClick={() => handlePauseClick(schedule.id, schedule.paused)}
            deleteClick={() => setShowDelete(schedule.id)}
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
      {showDelete && (
        <div className="p-4 fixed w-full h-full top-0 left-0 bg-black bg-opacity-50 grid place-content-center z-50">
          <div
            className={`rounded-lg bg-black border border-border-200 md:w-96`}
          >
            <h2 className="text-2xl font-medium p-4">Delete schedule</h2>
            <div className="bg-bg-200 p-4 border-y border-border-200">
              <p className="text-secondary">
                Are you sure you want to delete this schedule?
              </p>
            </div>
            <div className="p-4 flex items-center gap-4">
              <BaseButton
                type="secondary"
                onClick={() => setShowDelete(null)}
                fullWidth
              >
                Cancel
              </BaseButton>
              <BaseButton
                onClick={() => handleDeleteClick(showDelete)}
                fullWidth
              >
                Delete
              </BaseButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
