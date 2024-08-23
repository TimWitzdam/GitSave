import React from "react";
import Schedule from "./Schedule";
import type { ScheduleWithHistory } from "../../types/scheduleTypes";

type Props = {
  children: React.ReactNode[];
};

export default function ScheduleList(props: Props) {
  const [schedules, setSchedules] = React.useState<ScheduleWithHistory[]>([]);

  function getCookie(name: string) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
  }

  function timeAgo(timestamp: string) {
    const now = new Date().getTime();
    const then = new Date(timestamp);
    const diffInSeconds = Math.floor((now - then.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    }

    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };
    return then.toLocaleDateString("de-DE", options);
  }

  React.useEffect(() => {
    const authSessionCookie = getCookie("auth_session");
    fetch("/api/schedules", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authSessionCookie}`,
      },
    })
      .then((r) => r.json())
      .then((schedules) => {
        schedules.forEach((schedule: ScheduleWithHistory) => {
          schedule.backupHistory.forEach((history) => {
            history.timestamp = timeAgo(history.timestamp);
          });
        });
        setSchedules(schedules);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  return (
    <div>
      {schedules.map((schedule) => (
        <Schedule
          key={schedule.id}
          name={schedule.name}
          link={schedule.repository}
          lastBackup={schedule.backupHistory[0].timestamp}
        >
          {props.children}
        </Schedule>
      ))}
    </div>
  );
}
