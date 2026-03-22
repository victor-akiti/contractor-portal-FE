import Loading from "@/components/loading";
import { useGetCertReviewQueueQuery } from "@/redux/features/certReviewSlice";
import { useState } from "react";
import CertReviewModal from "./CertReviewModal";
import CertReviewRow from "./CertReviewRow";
import styles from "./certReview.module.css";

interface Props {
    user: any;
}

export default function CertReviewTab({ user }: Props) {
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const { data, isLoading } = useGetCertReviewQueueQuery(
        { userRole: user?.role || "" },
        { skip: !user?.role }
    );

    const items: any[] = data?.data?.certificates || data?.data || [];

    if (isLoading) {
        return <Loading message="Loading certificate review queue..." />;
    }

    return (
        <div className={styles.certReviewTab}>
            {selectedItem && (
                <CertReviewModal
                    item={selectedItem}
                    userRole={user?.role || ""}
                    onClose={() => setSelectedItem(null)}
                />
            )}

            {items.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>No certificates awaiting review.</p>
                </div>
            ) : (
                <table className={styles.queueTable}>
                    <thead>
                        <tr>
                            <th>Company</th>
                            <th>Certificate</th>
                            <th>File</th>
                            <th>Submitted</th>
                            <th>Expiry Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item: any, index: number) => (
                            <CertReviewRow
                                key={item._id || index}
                                item={item}
                                onReview={setSelectedItem}
                            />
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
