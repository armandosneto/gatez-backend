const getTrophies = (difficulty: number): number => {
  if (difficulty < 0.2) {
    return 100;
  } else if (difficulty < 0.6) {
    return 200;
  } else {
    return 400;
  }
};

export { getTrophies };
