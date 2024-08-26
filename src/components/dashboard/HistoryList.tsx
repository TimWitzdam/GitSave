import React from "react";
import History from "./History";
import type { ScheduleHistory } from "../../types/scheduleTypes";
import Pagination from "../Pagination/Pagination";
import BaseButton from "../BaseButton";

type Props = {
  disablePaging?: boolean;
};

export default function HistoryList({ disablePaging = false }: Props) {
  const [history, setHistory] = React.useState<ScheduleHistory[]>([]);
  const [total, setTotal] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [fetched, setFetched] = React.useState(false);
  const perPage = disablePaging ? 5 : 10;

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
    let offset = 0;
    const reloadButton = document.getElementById("reload") as HTMLButtonElement;

    reloadButton.addEventListener("click", () => {
      fetchHistory(perPage, offset);
    });

    if (!disablePaging) {
      setCurrentPage(
        location.search ? parseInt(location.search.split("?page=")[1]) : 1
      );
      const tmp = location.search
        ? parseInt(location.search.split("?page=")[1])
        : 1;
      offset = tmp === 1 ? 0 : tmp * perPage - perPage;
    }

    fetchHistory(perPage, offset);
  }, []);

  return (
    <div>
      <div
        className={`rounded-lg bg-bg-300 border border-border-200 ${!disablePaging && "mb-4"}`}
      >
        {history.map((item, index) => (
          <History
            key={item.id}
            timestamp={item.timestamp}
            name={item.backupJob.name}
            success={item.success}
            message={item.message}
            last={!disablePaging && index === history.length - 1}
          />
        ))}
        {disablePaging && (
          <a href="/dashboard/history" className="m-4 block w-fit">
            <BaseButton type="secondary">Show all</BaseButton>
          </a>
        )}
      </div>
      {!disablePaging && fetched && total > perPage && (
        <Pagination
          currentPage={currentPage}
          totalItems={total}
          perPage={perPage}
        />
      )}
    </div>
  );
}
