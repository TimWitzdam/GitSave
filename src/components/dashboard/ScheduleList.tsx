import React from "react";
import Schedule from "./Schedule";
import type { ScheduleWithHistory } from "../../types/scheduleTypes";

export default function ScheduleList() {
  const [schedules, setSchedules] = React.useState<ScheduleWithHistory[]>([]);

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

        setSchedules(schedules);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  React.useEffect(() => {
    loadSchedules();
    document.addEventListener("reloadSchedules", loadSchedules);
  }, []);

  return (
    <div>
      {schedules.map((schedule) => (
        <Schedule
          key={schedule.id}
          name={schedule.name}
          link={schedule.repository}
          lastBackup={schedule.backupHistory[0]?.timestamp || "Never"}
        />
      ))}
    </div>
  );
}
