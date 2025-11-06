import FloatingProgressIndicator from '@/components/floatingProgressIndicator'

interface Props {
  status: string
}

export default function FloatingControls({ status }: Props) {
  if (!status) return null

  return <FloatingProgressIndicator status={status} statusMessage="" />
}