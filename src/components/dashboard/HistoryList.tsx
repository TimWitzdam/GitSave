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
  const [loading, setLoading] = React.useState(true);
  const perPage = disablePaging ? 5 : 10;

  function fetchHistory(limit: number, offset: number) {
    setLoading(true);
    fetch(`/api/history?limit=${limit}&offset=${offset}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch history");
        }
        return res.json();
      })
      .then((data) => {
        setLoading(false);
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
    <div className="relative">
      {loading ? (
        <div className="absolute top-0 left-0 w-full rounded-lg bg-bg-300 border border-border-200">
          <div className="animate-[pulse_1s_cubic-bezier(0.4,0,0.6,1)_infinite]">
            {Array.from(Array(5).keys()).map((index) => (
              <div
                key={index}
                className={`${index !== 4 && "border-b border-border-200"} p-4`}
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
      ) : history.length === 0 ? (
        <div className={`rounded-lg bg-bg-300 border border-border-200`}>
          <div className="p-4">
            <p className="text-secondary">No history found</p>
          </div>
        </div>
      ) : (
        <div
          className={`rounded-lg bg-bg-300 border border-border-200 ${!disablePaging && "mb-4"}`}
        >
          {history.map((item, index) => (
            <History
              key={item.id}
              timestamp={item.timestamp}
              name={item.backupJob ? item.backupJob.name : "Deleted schedule"}
              success={item.success}
              message={item.message}
              last={!disablePaging && index === history.length - 1}
            />
          ))}
          {disablePaging && !loading && (
            <a href="/dashboard/history" className="m-4 block w-fit">
              <BaseButton type="secondary">Show all</BaseButton>
            </a>
          )}
        </div>
      )}
      {!disablePaging && !loading && fetched && total > perPage && (
        <Pagination
          currentPage={currentPage}
          totalItems={total}
          perPage={perPage}
        />
      )}
    </div>
  );
}
