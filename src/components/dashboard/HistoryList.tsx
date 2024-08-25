import React from "react";
import History from "./History";
import type { ScheduleHistory } from "../../types/scheduleTypes";
import Pagination from "../Pagination/Pagination";

export default function HistoryList() {
  const [history, setHistory] = React.useState<ScheduleHistory[]>([]);
  const [total, setTotal] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [fetched, setFetched] = React.useState(false);
  const perPage = 4;

  function fetchHistory(limit: number, offset: number) {
    fetch(`/api/history?limit=${limit}&offset=${offset}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch history");
        }
        return res.json();
      })
      .then((data) => {
        setHistory(data.backupHistory);
        setTotal(data.totalCount);
        setFetched(true);
      });
  }

  React.useEffect(() => {
    const reloadButton = document.getElementById(
      "reload-button"
    ) as HTMLButtonElement;

    reloadButton.addEventListener("click", () => {
      fetchHistory(perPage, offset);
    });

    setCurrentPage(
      location.search ? parseInt(location.search.split("?page=")[1]) : 1
    );
    const tmp = location.search
      ? parseInt(location.search.split("?page=")[1])
      : 1;
    const offset = tmp === 1 ? 0 : tmp * perPage - perPage;
    fetchHistory(perPage, offset);
  }, []);

  return (
    <div>
      <div className="rounded-lg bg-bg-300 border border-border-200 mb-4">
        {history.map((item, index) => (
          <History
            key={item.id}
            timestamp={item.timestamp}
            name={item.backupJob.name}
            success={item.success}
            message={item.message}
            last={index === history.length - 1}
          />
        ))}
      </div>
      {fetched && total > perPage && (
        <Pagination
          currentPage={currentPage}
          totalItems={total}
          perPage={perPage}
        />
      )}
    </div>
  );
}
