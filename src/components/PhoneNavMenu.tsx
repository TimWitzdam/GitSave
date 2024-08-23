import React from "react";

type Props = {
  links: { name: string; href: string }[];
  children: React.ReactNode;
};

export default function PhoneNavMenu(props: Props) {
  return (
    <div
      id="phone-nav-menu"
      className="opacity-0 pointer-events-none bg-bg-400 fixed top-0 left-0 w-full h-full transition-opacity duration-300"
    >
      <div className="p-4 flex items-start justify-between md:mb-4">
        <div className="rounded-lg p-2 flex items-center justify-center gap-4 border border-border-100 mb-4 w-12 h-12">
          {props.children}
        </div>
        <div className="flex items-center gap-4">
          <button
            id="close-phone-nav-menu"
            className="rounded-full border border-border-100 flex items-center justify-center w-12 h-12"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 18 23"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15.3902 6.76519C15.9518 6.20366 15.9518 5.29175 15.3902 4.73022C14.8287 4.1687 13.9168 4.1687 13.3553 4.73022L8.62501 9.46499L3.89025 4.73472C3.32872 4.17319 2.41681 4.17319 1.85529 4.73472C1.29376 5.29624 1.29376 6.20815 1.85529 6.76968L6.59005 11.5L1.85978 16.2347C1.29825 16.7962 1.29825 17.7082 1.85978 18.2697C2.4213 18.8312 3.33322 18.8312 3.89474 18.2697L8.62501 13.5349L13.3598 18.2652C13.9213 18.8267 14.8332 18.8267 15.3947 18.2652C15.9563 17.7037 15.9563 16.7917 15.3947 16.2302L10.66 11.5L15.3902 6.76519Z"
                fill="white"
              />
            </svg>
          </button>
        </div>
      </div>
      <div>
        <ul>
          {props.links.map((link, index) => (
            <li key={index}>
              <a
                href={link.href}
                className="p-4 py-6 bg-bg-300 flex items-center justify-between text-2xl font-medium border-b border-border-200"
              >
                <span>{link.name}</span>
                <svg
                  width="17"
                  height="16"
                  viewBox="0 0 17 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16.7071 8.70711C17.0976 8.31658 17.0976 7.68342 16.7071 7.29289L10.3431 0.928932C9.95262 0.538408 9.31946 0.538408 8.92893 0.928932C8.53841 1.31946 8.53841 1.95262 8.92893 2.34315L14.5858 8L8.92893 13.6569C8.53841 14.0474 8.53841 14.6805 8.92893 15.0711C9.31946 15.4616 9.95262 15.4616 10.3431 15.0711L16.7071 8.70711ZM0 9H16V7H0V9Z"
                    fill="white"
                  />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
