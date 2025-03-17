export default function updateIfNotBelow(
  e: React.ChangeEvent<HTMLInputElement>,
  setFunction: React.Dispatch<React.SetStateAction<number>>,
  minValue = 1,
) {
  if (parseInt(e.target.value) < minValue) {
    setFunction(minValue);
    return;
  }

  setFunction(parseInt(e.target.value));
}
