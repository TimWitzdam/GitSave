type Props = {
  size?: number;
};

export default function BurgerMenuIcon({ size = 22 }: Props) {
  return (
    <svg
      width={size}
      height={size + 2}
      viewBox="0 0 16 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 3.375C0 2.75273 0.510714 2.25 1.14286 2.25H14.8571C15.4893 2.25 16 2.75273 16 3.375C16 3.99727 15.4893 4.5 14.8571 4.5H1.14286C0.510714 4.5 0 3.99727 0 3.375ZM0 9C0 8.37773 0.510714 7.875 1.14286 7.875H14.8571C15.4893 7.875 16 8.37773 16 9C16 9.62227 15.4893 10.125 14.8571 10.125H1.14286C0.510714 10.125 0 9.62227 0 9ZM16 14.625C16 15.2473 15.4893 15.75 14.8571 15.75H1.14286C0.510714 15.75 0 15.2473 0 14.625C0 14.0027 0.510714 13.5 1.14286 13.5H14.8571C15.4893 13.5 16 14.0027 16 14.625Z"
        fill="white"
      ></path>
    </svg>
  );
}