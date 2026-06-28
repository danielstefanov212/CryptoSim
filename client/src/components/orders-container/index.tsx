import clsx from "clsx";

import { Order } from "../../lib/orders";
import { formatCurrency, formatDate } from "../../lib/formatters";

import styles from "./styles.module.css";

interface OrdersContainerProps {
  orders: Order[];
  title?: string;
  showSymbol?: boolean;
}

export function OrdersContainer({
  orders,
  title = "Order history",
  showSymbol = true,
}: OrdersContainerProps) {
  return (
    <section className={styles.mainContainer}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.count}>
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </span>
      </header>

      {orders.length === 0 ? (
        <p className={styles.empty}>
          No orders yet — place your first trade to see it here.
        </p>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                {showSymbol && <th>Symbol</th>}
                <th>Amount</th>
                <th>Fill price</th>
                <th>Total</th>
                <th>Filled</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <span
                      className={clsx(
                        styles.typePill,
                        order.orderType === "BUY"
                          ? styles.typeBuy
                          : styles.typeSell,
                      )}
                    >
                      {order.orderType}
                    </span>
                  </td>
                  {showSymbol && (
                    <td>
                      <span className={styles.symbol}>{order.symbol}</span>
                    </td>
                  )}
                  <td>{order.amount}</td>
                  <td>{formatCurrency(Number(order.priceAtExecution), 2)}</td>
                  <td>{formatCurrency(Number(order.totalCost), 2)}</td>
                  <td className={styles.dateCell}>
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
