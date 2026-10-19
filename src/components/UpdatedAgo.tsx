import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

type Props = {
  since: Date;
};

export function UpdatedAgo({ since }: Props) {
  // Храним текущее время, чтобы перерисовывать компонент
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Сбрасываем время при изменении since
    setNow(Date.now());

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    // Очищаем интервал при размонтировании или изменении since
    return () => clearInterval(interval);
  }, [since]);

  const seconds = Math.max(0, Math.floor((now - since.getTime()) / 1000));

  return <Text style={styles.text}>Обновлено {seconds} сек назад</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    color: '#6b7280',
  },
});