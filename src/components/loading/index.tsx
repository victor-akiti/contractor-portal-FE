import styles from "./styles/styles.module.css";

const Loading = ({message}) => {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingiospinnergear2by998twmg8}>
        <div className={styles.ldioyzaezf3dcmj}>
          <div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>
      </div>

      <p>{message}</p>
    </div>
  );
};

export default Loading
