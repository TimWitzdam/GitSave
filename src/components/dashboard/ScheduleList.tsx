import React from "react";
import Schedule from "./Schedule";
import type { ScheduleWithHistory } from "../../types/scheduleTypes";

export default function ScheduleList() {
  const [schedules, setSchedules] = React.useState<ScheduleWithHistory[]>([]);
  const [loading, setLoading] = React.useState(true);

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

  React.useEffect(() => {
    loadSchedules();
    document.addEventListener("reloadSchedules", loadSchedules);
  }, []);

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
                className={` ${index !== 2 && "border-b border-border-200"} p-4`}
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
          />
        ))
      )}
    </div>
  );
}
