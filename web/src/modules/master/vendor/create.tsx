import { VendorDrawer } from './components/VendorDrawer'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paths } from '@/app/routes/paths'

const CreateVendorPage = () => {
    const navigate = useNavigate()
    const [open, setOpen] = useState(true)

    useEffect(() => {
        if (!open) {
            navigate(paths.master.vendors)
        }
    }, [open, navigate])

    return (
        <VendorDrawer
            open={open}
            onOpenChange={setOpen}
            vendor={null}
            onSuccess={() => navigate(paths.master.vendors)}
        />
    )
}

export default CreateVendorPage
