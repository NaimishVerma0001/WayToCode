export const getCountdown = (date) => {

  const now = Date.now();

  const target = new Date(date).getTime();

  const diff = Math.max(target - now, 0);

  return {

    total: diff,

    days: Math.floor(diff / 86400000),

    hours: Math.floor(
      (diff % 86400000) / 3600000
    ),

    minutes: Math.floor(
      (diff % 3600000) / 60000
    ),

    seconds: Math.floor(
      (diff % 60000) / 1000
    ),

  };

};