'use client';

import { useEffect, useState, FormEvent } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [mobileNumber, setMobileNumber] = useState('');
  const [locale, setLocale] = useState('en');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    if (!session) {
      router.push('/');
      return;
    }

    setUser(session.user);

    // Load profile data
    const { data: profile } = await supabaseBrowser
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (profile) {
      setFullName(profile.full_name || '');
      // Parse mobile number to extract country code
      const mobile = profile.mobile_number || '';
      if (mobile.startsWith('+')) {
        // List of valid country codes to check against (longest first to match correctly)
        const validCodes = ['+1684', '+1264', '+1268', '+1242', '+1246', '+1441', '+1345', '+1767', '+1809', '+1473', '+1671', '+1876', '+1670', '+1787', '+1664', '+1649', '+1869', '+1758', '+1784', '+1721', '+1868', '+1284', '+1340', '+93', '+355', '+213', '+376', '+244', '+672', '+54', '+374', '+297', '+61', '+43', '+994', '+973', '+880', '+375', '+32', '+501', '+229', '+975', '+591', '+387', '+267', '+55', '+246', '+673', '+359', '+226', '+257', '+855', '+237', '+1', '+238', '+236', '+235', '+56', '+86', '+57', '+269', '+242', '+243', '+682', '+506', '+225', '+385', '+53', '+599', '+357', '+420', '+45', '+253', '+593', '+20', '+503', '+240', '+291', '+372', '+251', '+500', '+298', '+679', '+358', '+33', '+594', '+689', '+241', '+220', '+995', '+49', '+233', '+350', '+30', '+299', '+590', '+502', '+44', '+224', '+245', '+592', '+509', '+379', '+504', '+852', '+36', '+354', '+91', '+62', '+98', '+964', '+353', '+972', '+39', '+81', '+962', '+7', '+254', '+686', '+850', '+82', '+383', '+965', '+996', '+856', '+371', '+961', '+266', '+231', '+218', '+423', '+370', '+352', '+853', '+389', '+261', '+265', '+60', '+960', '+223', '+356', '+692', '+596', '+222', '+230', '+262', '+52', '+691', '+373', '+377', '+976', '+382', '+212', '+258', '+95', '+264', '+674', '+977', '+31', '+687', '+64', '+505', '+227', '+234', '+683', '+47', '+968', '+92', '+680', '+970', '+507', '+675', '+595', '+51', '+63', '+48', '+351', '+974', '+40', '+250', '+290', '+508', '+685', '+378', '+239', '+966', '+221', '+381', '+248', '+232', '+65', '+421', '+386', '+677', '+252', '+27', '+211', '+34', '+94', '+249', '+597', '+268', '+46', '+41', '+963', '+886', '+992', '+255', '+66', '+670', '+228', '+690', '+676', '+216', '+90', '+993', '+688', '+256', '+380', '+971', '+598', '+998', '+678', '+58', '+84', '+681', '+967', '+260', '+263'];
        
        // Find matching country code
        let foundCode = '+1'; // default
        for (const code of validCodes) {
          if (mobile.startsWith(code)) {
            foundCode = code;
            break;
          }
        }
        
        setCountryCode(foundCode);
        setMobileNumber(mobile.slice(foundCode.length));
      } else {
        setMobileNumber(mobile);
      }
      setLocale(profile.locale || 'en');
    }

    setLoading(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    const { error } = await supabaseBrowser
      .from('profiles')
      .update({
        full_name: fullName,
        mobile_number: `${countryCode}${mobileNumber}`,
        locale: locale,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess('Profile updated successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-800 border-t-[#4169E1] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to app
        </Link>

        <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Information */}
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Account Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full rounded-lg bg-[#0a0a0a] border border-gray-800 px-4 py-3 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full rounded-lg bg-[#0a0a0a] border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-colors"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="mobile" className="block text-sm font-medium text-gray-300 mb-2">
                Mobile Number
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  className="w-32 rounded-lg bg-[#0a0a0a] border border-gray-800 px-3 py-3 text-white focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-colors"
                >
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+86">🇨🇳 +86</option>
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+39">🇮🇹 +39</option>
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+52">🇲🇽 +52</option>
                  <option value="+55">🇧🇷 +55</option>
                  <option value="+7">🇷🇺 +7</option>
                  <option value="+82">🇰🇷 +82</option>
                  <option value="+65">🇸🇬 +65</option>
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+27">🇿🇦 +27</option>
                  <option value="+63">🇵🇭 +63</option>
                  <option value="+66">🇹🇭 +66</option>
                  <option value="+84">🇻🇳 +84</option>
                </select>
                <input
                  id="mobile"
                  type="tel"
                  value={mobileNumber}
                  onChange={e => setMobileNumber(e.target.value)}
                  className="flex-1 rounded-lg bg-[#0a0a0a] border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-colors"
                  placeholder="555 123 4567"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3">
              <p className="text-sm text-green-400">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-lg bg-[#4169E1] hover:bg-[#3557c7] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
