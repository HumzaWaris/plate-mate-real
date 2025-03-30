'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import '../globals.css'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export default function Dashboard() {
    const [formData, setFormData] = useState({
        startingWeight: '',
        heightInches: '',
        gender: '',
        restrictions: '',
        allergies: [],
        activity: 'moderate',
    })
    const [user, setUser] = useState(null)
    const [showAllergens, setShowAllergens] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error || !user) {
                router.push('/login')
            } else {
                setUser(user)
            }
        }
        getUser()
    }, [router])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target
        setFormData((prev) => {
            const newAllergies = checked
                ? [...prev.allergies, value]
                : prev.allergies.filter((a) => a !== value)
            return { ...prev, allergies: newAllergies }
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        const { error } = await supabase.from('profiles').insert([{ ...formData, user_id: user.id }])
        if (error) {
            console.error('Error saving to Supabase:', error.message)
        } else {
            alert('Data saved to Supabase!')
        }
    }

    const allergenOptions = [
        'Eggs', 'Milk', 'Vegetarian', 'Gluten', 'Soy', 'Wheat', 'Vegan', 'Sesame', 'Coconut', 'Tree nuts', 'Peanuts'
    ]

    return (
        <div style={{ display: 'flex', minHeight: '100vh', color: 'white', fontFamily: 'Segoe UI, sans-serif', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', backgroundAttachment: 'fixed', backgroundRepeat: 'no-repeat' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <header style={{ backgroundColor: '#1e293b', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)', zIndex: 1 }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Dashboard</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Allen Clerk</span>
                        <img src="https://i.pravatar.cc/40" alt="Avatar" style={{ borderRadius: '9999px', width: '2rem', height: '2rem' }} />
                    </div>
                </header>

                <main style={{ padding: '2rem', zIndex: 1 }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '2.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Nutrition Dashboard</h2>
                        <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Enter your details to receive a personalized AI-based meal plan</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '2rem', maxWidth: '1000px', margin: '0 auto', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                            {[
                                { field: 'startingWeight', label: 'Weight' },
                                { field: 'heightInches', label: 'Height (inches)' }
                            ].map(({ field, label }) => (
                                <div key={field} style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>{label}</label>
                                    <input
                                        type="number"
                                        name={field}
                                        value={formData[field as keyof typeof formData] as string}
                                        onChange={handleChange}
                                        style={{ backgroundColor: '#334155', color: 'white', border: '1px solid #475569', borderRadius: '0.5rem', padding: '0.75rem' }}
                                    />
                                </div>
                            ))}

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Gender</label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    style={{ backgroundColor: '#334155', color: 'white', border: '1px solid #475569', borderRadius: '0.5rem', padding: '0.75rem' }}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Dietary Restrictions</label>
                                <input
                                    type="text"
                                    name="restrictions"
                                    value={formData.restrictions}
                                    onChange={handleChange}
                                    style={{ backgroundColor: '#334155', color: 'white', border: '1px solid #475569', borderRadius: '0.5rem', padding: '0.75rem' }}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 3', position: 'relative' }}>
                                <label style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>Allergies</label>
                                <div style={{ marginTop: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowAllergens(!showAllergens)}
                                        style={{
                                            backgroundColor: '#334155',
                                            color: 'white',
                                            border: '1px solid #475569',
                                            borderRadius: '0.5rem',
                                            padding: '0.75rem',
                                            width: '100%',
                                            textAlign: 'left',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {formData.allergies.length > 0 ? formData.allergies.join(', ') : 'Select Allergies'}
                                    </button>

                                    {showAllergens && (
                                        <div style={{
                                            position: 'absolute',
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #475569',
                                            borderRadius: '0.5rem',
                                            padding: '1rem',
                                            marginTop: '0.5rem',
                                            zIndex: 10,
                                            width: '100%',
                                            maxHeight: '200px',
                                            overflowY: 'auto'
                                        }}>
                                            {allergenOptions.map(option => (
                                                <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        value={option}
                                                        checked={formData.allergies.includes(option)}
                                                        onChange={handleCheckboxChange}
                                                    />
                                                    {option}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Activity Level</label>
                                <select
                                    name="activity"
                                    value={formData.activity}
                                    onChange={handleChange}
                                    style={{ backgroundColor: '#334155', color: 'white', border: '1px solid #475569', borderRadius: '0.5rem', padding: '0.75rem' }}
                                >
                                    <option value="low">Low Activity</option>
                                    <option value="moderate">Moderate Activity</option>
                                    <option value="high">High Activity</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            style={{ marginTop: '2rem', width: '100%', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', padding: '0.85rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                        >
                            Save and Continue
                        </button>
                    </form>
                </main>
            </div>
        </div>
    )
}
