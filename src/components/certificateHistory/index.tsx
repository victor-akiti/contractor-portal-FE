import Link from "next/link"
import Modal from "../modal"
import styles from "./styles/styles.module.css"

const CertificateHistoryModal = ({currentCertificateHistory, clearCurrentCertificateHistory}) => {
    return <Modal>
        <div className={styles.certificateHistoryModal}>
            <h2>{`${currentCertificateHistory[0].label} History`}</h2>


            <table>
                <thead>
                    <tr>
                        <td>File Name</td>
                        <td>Date Uploaded</td>
                        <td>Expiry Date</td>
                        <td>Action</td>
                    </tr>
                </thead>

                <tbody>
                    {
                        currentCertificateHistory.map((item, index) => <tr key={index}>
                        <td>
                            <p>{item.name}</p>
                        </td>

                        <td>
                            <p>{new Date(item.createdAt).toLocaleDateString("en-NG")}</p>
                        </td>

                        <td>
                            <p>{new Date(item.expiryDate).toLocaleDateString("en-NG")}</p>
                        </td>

                        <td>
                            <Link href={item.url} target="_blank">View</Link>
                        </td>
                    </tr>)
                    }
                </tbody>
            </table>

            <footer>
                <button onClick={() => {clearCurrentCertificateHistory()}}>Close</button>
            </footer>


        </div>
    </Modal>
}

export default CertificateHistoryModal