import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import Footer from './Footer';

export default function Auth() {
  const [isLoginView, setIsLoginView] = useState(true);
  const [isAdminVerify, setIsAdminVerify] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const [loginId, setLoginId] = useState('');
  const [signupId, setSignupId] = useState('');
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const [partnerLabel, setPartnerLabel] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerFont, setPartnerFont] = useState('GE SS Two');

  useEffect(() => {
    fetch('/partner.json')
      .then(res => res.json())
      .then(data => {
        setPartnerLabel(data.label);
        setPartnerName(data.name);
      })
      .catch(err => {
        console.error('خطأ في تحميل النص:', err);

        // قيم افتراضية في حالة فشل التحميل
        setPartnerLabel('بالتعاون مع:');
        setPartnerName('مركز ماكس');
      });
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const checkRoleAndRedirect = async (userId) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      toast.error('تعذر جلب بيانات الصلاحيات، راجع الإدارة');
      setLoading(false);
      return false;
    }

    if (profile.role === 'admin') {
      navigate('/admin');
    } else if (profile.role === 'teacher') {
      navigate('/teacher');
    } else {
      navigate(from, { replace: true });
    }

    return true;
  };

  const ensureProfile = async (
    userId,
    nationalIdValue,
    fullNameValue,
    branchValue,
    phoneValue
  ) => {
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existing) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            nationalID: nationalIdValue,
            name: fullNameValue,
            role: 'student',
            branch: branchValue,
            phone: phoneValue
          }
        ]);

      if (insertError) throw insertError;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const currentId = isLoginView ? loginId : signupId;

    if (!currentId.trim()) {
      toast.error('رقم الهوية مطلوب');
      return;
    }

    if (/\s/.test(currentId)) {
      toast.error('رقم الهوية لا يجب أن يحتوي على مسافات');
      return;
    }

    const idRegex = /^\d+$/;

    if (!idRegex.test(currentId)) {
      toast.error('يجب أن يتكون رقم الهوية من أرقام فقط');
      return;
    }

    if (currentId.length !== 9) {
      toast.error('رقم الهوية يجب أن يكون 9 أرقام');
      return;
    }

    if (!isLoginView && !isAdminVerify) {
      if (!fullName.trim()) {
        toast.error('الرجاء إدخال الاسم الرباعي');
        return;
      }

      if (!branch) {
        toast.error('الرجاء اختيار الفرع الدراسي');
        return;
      }

      if (!phone.trim()) {
        toast.error('الرجاء إدخال رقم الجوال');
        return;
      }

      const phoneRegex = /^(059|056)\d{7}$/;

      if (!phoneRegex.test(phone.trim())) {
        toast.error('يرجى إدخال رقم جوال صحيح');
        return;
      }
    }

    const email = `${currentId}@nokhba.local`;

    // -------------------------------
    // تأكيد دخول الإدارة
    // -------------------------------
    if (isAdminVerify) {
      if (!adminPassword.trim()) {
        toast.error('الرجاء إدخال كود التأكيد');
        return;
      }

      setLoading(true);

      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password: adminPassword
        });

      if (signInError) {
        toast.error('كود التأكيد غير صحيح');
        setLoading(false);
        return;
      }

      if (authData.user) {
        navigate('/admin');
      }

      return;
    }

    setLoading(true);

    // -------------------------------
    // تسجيل الدخول
    // -------------------------------
    if (isLoginView) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('nationalID', currentId)
        .maybeSingle();

      if (profile && profile.role === 'admin') {
        setIsAdminVerify(true);
        setLoading(false);
        return;
      }

      const password = currentId;

      let {
        data: authData,
        error: signInError
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(email);

        if (!resetError) {
          toast.error(
            'هذا الحساب يحتاج تحديث. جاري تحويلك لإنشاء حساب...'
          );

          setIsLoginView(false);
          setSignupId(currentId);
          setLoading(false);
          return;
        }

        toast.error(
          'رقم الهوية غير مسجل. الرجاء إنشاء حساب جديد'
        );

        setLoading(false);
        return;
      }

      if (authData.user) {
        try {
          await ensureProfile(
            authData.user.id,
            currentId,
            '',
            '',
            ''
          );

          await checkRoleAndRedirect(authData.user.id);
        } catch (err) {
          console.error('حدث خطأ:', err);

          toast.error(
            'حدث خطأ. يرجى المحاولة مرة أخرى'
          );

          setLoading(false);
        }
      }
    }

    // -------------------------------
    // إنشاء حساب جديد
    // -------------------------------
    else {
      const password = currentId;

      const {
        data: signUpData,
        error: signUpError
      } = await supabase.auth.signUp({
        email,
        password
      });

      if (signUpError) {
        if (
          signUpError.message?.includes('duplicate') ||
          signUpError.message?.includes('already')
        ) {
          toast(
            'هذا الرقم مسجل بالفعل. جاري تسجيل الدخول...'
          );

          const {
            data: loginData,
            error: loginError
          } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (loginError) {
            toast.error(
              'كلمة المرور غير متطابقة. تواصل مع الإدارة لتحديث الحساب'
            );

            setLoading(false);
            return;
          }

          if (loginData.user) {
            await checkRoleAndRedirect(loginData.user.id);
            return;
          }
        }

        toast.error(
          'يرجى التأكد من صحة البيانات'
        );

        setLoading(false);
        return;
      }

      if (signUpData.user) {
        try {
          await ensureProfile(
            signUpData.user.id,
            currentId,
            fullName,
            branch,
            phone
          );

          await checkRoleAndRedirect(
            signUpData.user.id
          );
        } catch (profileError) {
          console.error(
            'فشل إنشاء البروفايل:',
            profileError
          );

          toast.error(
            'تم إنشاء الحساب ولكن فشل حفظ الملف الشخصي'
          );

          await supabase.auth.signOut();

          setLoading(false);
        }
      }
    }
  };

  return (
    <div className="auth-page-container">

      {/* --------------------------------
          الشعار فوق الكارد
          بدون Mask / Blind Mode
      --------------------------------- */}
      <div className="top-logo-container">
        <div className="premium-logo-wrapper">
          <img
            src="https://i.imgur.com/fEzzMhB.png"
            alt="النخبة"
            className="premium-logo-img"
          />
        </div>
      </div>

      {/* --------------------------------
          بيانات الشريك
      --------------------------------- */}
      <div
        className="partner-text"
        style={{ fontFamily: partnerFont }}
      >
        <div className="partner-label">
          {partnerLabel}
        </div>

        <div className="partner-name">
          {partnerName}
        </div>
      </div>

      {/* --------------------------------
          بطاقة تسجيل الدخول
      --------------------------------- */}
      <div className="auth-card">

        <h1 className="auth-title">
          {
            isAdminVerify
              ? 'تأكيد هوية الإدارة'
              : isLoginView
                ? 'تسجيل الدخول'
                : 'إنشاء حساب جديد'
          }
        </h1>

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >

          {/* --------------------------------
              تحقق الإدارة
          --------------------------------- */}
          {isAdminVerify ? (
            <div className="input-group">

              <label>
                <svg
                  className="label-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    ry="2"
                  />

                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>

                كلمة المرور
              </label>

              <div className="input-wrapper">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) =>
                    setAdminPassword(e.target.value)
                  }
                  placeholder="•••••••"
                  required
                  className="auth-input"
                  style={{
                    direction: 'ltr',
                    textAlign: 'right'
                  }}
                />
              </div>

            </div>
          ) : (

            <>
              {/* --------------------------------
                  بيانات التسجيل
              --------------------------------- */}
              {!isLoginView && (
                <>

                  {/* الاسم الرباعي */}
                  <div className="input-group">

                    <label>
                      <svg
                        className="label-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />

                        <circle
                          cx="12"
                          cy="7"
                          r="4"
                        />
                      </svg>

                      الاسم الرباعي
                    </label>

                    <div className="input-wrapper">
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) =>
                          setFullName(e.target.value)
                        }
                        placeholder="مثال: نادر محمد حسن أبو سليمان"
                        required
                        className="auth-input"
                      />
                    </div>

                  </div>

                  {/* الفرع الدراسي */}
                  <div className="input-group">

                    <label>
                      <svg
                        className="label-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />

                        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                      </svg>

                      الفرع الدراسي
                    </label>

                    <div className="input-wrapper">

                      <select
                        value={branch}
                        onChange={(e) =>
                          setBranch(e.target.value)
                        }
                        required
                        className="auth-input"
                        style={{
                          cursor: 'pointer'
                        }}
                      >
                        <option
                          value=""
                          disabled
                        >
                          اختر الفرع
                        </option>

                        <option value="العلمي">
                          العلمي
                        </option>

                        <option value="الأدبي">
                          الأدبي
                        </option>
                      </select>

                    </div>

                  </div>

                  {/* رقم الجوال */}
                  <div className="input-group">

                    <label>
                      <svg
                        className="label-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="5"
                          y="2"
                          width="14"
                          height="20"
                          rx="2"
                          ry="2"
                        />

                        <line
                          x1="12"
                          y1="18"
                          x2="12.01"
                          y2="18"
                        />
                      </svg>

                      رقم الجوال
                    </label>

                    <div className="input-wrapper">

                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value)
                        }
                        placeholder="059xxxxxxx :مثال"
                        className="auth-input"
                        required
                      />

                    </div>

                  </div>

                </>
              )}

              {/* --------------------------------
                  رقم الهوية
              --------------------------------- */}
              <div className="input-group">

                <label>
                  <svg
                    className="label-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />

                    <circle
                      cx="12"
                      cy="7"
                      r="4"
                    />
                  </svg>

                  رقم الهوية
                </label>

                <div className="input-wrapper">

                  <input
                    type="text"
                    value={
                      isLoginView
                        ? loginId
                        : signupId
                    }
                    onChange={(e) => {
                      const val =
                        e.target.value.replace(
                          /\s/g,
                          ''
                        );

                      if (isLoginView) {
                        setLoginId(val);
                      } else {
                        setSignupId(val);
                      }
                    }}
                    placeholder="أدخل رقم الهوية"
                    required
                    className="auth-input"
                    style={{
                      direction: 'ltr',
                      textAlign: 'right'
                    }}
                  />

                </div>

              </div>

            </>
          )}

          {/* --------------------------------
              زر الإرسال
          --------------------------------- */}
          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {
              loading
                ? 'جاري التحميل...'
                : isAdminVerify
                  ? 'تأكيد الدخول'
                  : isLoginView
                    ? 'تسجيل الدخول'
                    : 'إنشاء حساب'
            }
          </button>

        </form>

        {/* --------------------------------
            تبديل تسجيل الدخول / التسجيل
        --------------------------------- */}
        <div className="toggle-view">

          {isAdminVerify ? (

            <p>
              ليس لديك صلاحيات مدير ؟

              <span
                onClick={() => {
                  setIsAdminVerify(false);
                  setAdminPassword('');
                }}
              >
                تسجيل الدخول
              </span>
            </p>

          ) : isLoginView ? (

            <p>
              ليس لديك حساب؟

              <span
                onClick={() =>
                  setIsLoginView(false)
                }
              >
                إنشاء حساب جديد
              </span>
            </p>

          ) : (

            <p>
              لديك حساب بالفعل؟

              <span
                onClick={() =>
                  setIsLoginView(true)
                }
              >
                تسجيل الدخول
              </span>
            </p>

          )}

        </div>

      </div>

      <Footer />

      {/* ==========================================
          CSS
      =========================================== */}
      <style>{`

        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');

        /* -----------------------------------------
           GE SS Two
        ------------------------------------------ */
        @font-face {
          font-family: 'GE SS Two';

          src:
            url('/fonts/GE_SS_Two/GE_SS_Two.woff2')
            format('woff2'),

            url('/fonts/GE_SS_Two/GE_SS_Two.otf')
            format('opentype');

          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        @font-face {
          font-family: 'GE SS Two';

          src:
            url('/fonts/GE_SS_Two/Bold.woff2')
            format('woff2'),

            url('/fonts/GE_SS_Two/Bold.otf')
            format('opentype');

          font-weight: bold;
          font-style: normal;
          font-display: swap;
        }

        /* -----------------------------------------
           Global
        ------------------------------------------ */
        :root {
          color-scheme: light only;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;

          font-family: 'Cairo', sans-serif;

          background: #eef5ff;

          color: #1e293b;
        }

        input,
        select,
        button,
        textarea {
          font-family: 'Cairo', sans-serif;
        }

        /* -----------------------------------------
           الصفحة
        ------------------------------------------ */
        .auth-page-container {
          min-height: 100vh;

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          direction: rtl;

          background:
            linear-gradient(
              135deg,
              #eef5ff 0%,
              #d8e8fc 100%
            );

          position: relative;

          padding: 20px;
        }

        /* -----------------------------------------
           اللوجو
           بدون Mask / Blind Mode
        ------------------------------------------ */
        .top-logo-container {
          position: relative;

          margin-bottom: 15px;

          z-index: 20;

          display: flex;

          justify-content: center;

          align-items: center;

          width: 100%;

          animation:
            logoEntrance
            1s
            ease-out
            both;
        }

        .premium-logo-wrapper {
          position: relative;

          display: inline-flex;

          justify-content: center;

          align-items: center;

          /*
            مهم:
            لا يوجد mask-image هنا
            ولا webkit-mask-image
            حتى يظهر اللوجو كاملًا
          */

          overflow: visible;

          animation:
            floating
            4s
            ease-in-out
            infinite;
        }

        .premium-logo-img {
          width: 190px;

          height: auto;

          max-width: 90vw;

          display: block;

          /*
            يحافظ على أبعاد اللوجو
            ويمنع تشويهه أو قصه
          */
          object-fit: contain;

          filter:
            drop-shadow(
              0 10px 20px
              rgba(74, 138, 218, 0.15)
            );
        }

        /* -----------------------------------------
           تأثير اللمعة
        ------------------------------------------ */
        .premium-logo-wrapper::after {
          content: "";

          position: absolute;

          top: 0;

          left: -120%;

          width: 45%;

          height: 100%;

          background:
            linear-gradient(
              to right,
              rgba(255, 255, 255, 0) 0%,
              rgba(255, 255, 255, 0.45) 50%,
              rgba(255, 255, 255, 0) 100%
            );

          transform:
            skewX(-25deg);

          pointer-events: none;

          animation:
            softShine
            7s
            infinite
            ease-in-out;
        }

        /* -----------------------------------------
           نص الشريك
        ------------------------------------------ */
        .partner-text {
          text-align: center;

          backdrop-filter:
            blur(4px);

          padding: 8px 20px;

          border-radius: 40px;

          margin-bottom: 20px;

          display: inline-block;

          width: auto;

          max-width: 90%;

          animation:
            fadeInUp
            0.6s
            ease-out
            both;
        }

        .partner-label {
          font-size: 12px;

          font-weight: 500;

          color: #4a8ada;

          letter-spacing: 0.5px;

          margin-bottom: -6px;
        }

        .partner-name {
          font-size: 16px;

          font-weight: 700;

          color: #2c5282;
        }

        /* -----------------------------------------
           الكارد
        ------------------------------------------ */
        .auth-card {
          background:
            rgba(
              255,
              255,
              255,
              0.96
            );

          backdrop-filter:
            blur(12px);

          width: 100%;

          max-width: 400px;

          padding: 30px;

          border-radius: 24px;

          box-shadow:
            0 15px 35px
            rgba(0, 0, 0, 0.07);

          z-index: 10;

          animation:
            cardFadeIn
            0.8s
            ease-out
            both;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.3
            );
        }

        /* -----------------------------------------
           العنوان
        ------------------------------------------ */
        .auth-title {
          text-align: center;

          color: #2c3e50;

          margin-bottom: 25px;

          font-size: 22px;

          font-weight: 700;
        }

        /* -----------------------------------------
           الفورم
        ------------------------------------------ */
        .auth-form {
          display: flex;

          flex-direction: column;

          gap: 18px;
        }

        /* -----------------------------------------
           مجموعات الإدخال
        ------------------------------------------ */
        .input-group label {
          display: flex;

          align-items: center;

          gap: 8px;

          font-size: 14px;

          font-weight: 600;

          color: #4a5568;

          margin-bottom: 7px;
        }

        /* -----------------------------------------
           أيقونات الحقول
        ------------------------------------------ */
        .label-icon {
          width: 16px;

          height: 16px;

          color: #4a8ada;

          flex-shrink: 0;
        }

        /* -----------------------------------------
           Inputs / Select
        ------------------------------------------ */
        .input-wrapper input,
        .input-wrapper select {
          width: 100%;

          padding: 13px 15px;

          border:
            1.5px solid
            #e2e8f0;

          border-radius: 12px;

          font-size: 14px;

          background: #f8fafc;

          color: #1e293b;

          transition:
            all 0.3s ease;

          text-align: right;

          outline: none;
        }

        /* -----------------------------------------
           Focus
        ------------------------------------------ */
        .input-wrapper input:focus,
        .input-wrapper select:focus {
          border-color: #4a8ada;

          background: #ffffff;

          box-shadow:
            0 0 0 4px
            rgba(
              74,
              138,
              218,
              0.1
            );
        }

        /* -----------------------------------------
           زر الدخول
        ------------------------------------------ */
        .submit-btn {
          width: 100%;

          padding: 14px;

          border: none;

          border-radius: 12px;

          background:
            linear-gradient(
              135deg,
              #4a8ada,
              #3b76c4
            );

          color: white;

          font-size: 16px;

          font-weight: 700;

          cursor: pointer;

          transition:
            0.3s;

          box-shadow:
            0 8px 15px
            rgba(
              74,
              138,
              218,
              0.25
            );

          margin-top: 10px;
        }

        .submit-btn:hover {
          transform:
            translateY(-2px);

          box-shadow:
            0 12px 20px
            rgba(
              74,
              138,
              218,
              0.35
            );
        }

        .submit-btn:disabled {
          opacity: 0.7;

          cursor: not-allowed;

          transform: none;
        }

        /* -----------------------------------------
           تبديل Login / Signup
        ------------------------------------------ */
        .toggle-view {
          text-align: center;

          margin-top: 20px;

          font-size: 14px;

          color: #4a5568;
        }

        .toggle-view span {
          color: #4a8ada;

          cursor: pointer;

          font-weight: 700;

          margin-right: 5px;
        }

        .toggle-view span:hover {
          text-decoration: underline;
        }

        /* -----------------------------------------
           Animation: Logo Entrance
        ------------------------------------------ */
        @keyframes logoEntrance {
          from {
            opacity: 0;

            transform:
              translateY(-25px);
          }

          to {
            opacity: 1;

            transform:
              translateY(0);
          }
        }

        /* -----------------------------------------
           Animation: Floating
        ------------------------------------------ */
        @keyframes floating {
          0%,
          100% {
            transform:
              translateY(0);
          }

          50% {
            transform:
              translateY(-8px);
          }
        }

        /* -----------------------------------------
           Animation: Card
        ------------------------------------------ */
        @keyframes cardFadeIn {
          from {
            opacity: 0;

            transform:
              translateY(20px);
          }

          to {
            opacity: 1;

            transform:
              translateY(0);
          }
        }

        /* -----------------------------------------
           Animation: Shine
        ------------------------------------------ */
        @keyframes softShine {
          0% {
            left: -120%;
          }

          35% {
            left: 140%;
          }

          100% {
            left: 140%;
          }
        }

        /* -----------------------------------------
           Animation: Partner Text
        ------------------------------------------ */
        @keyframes fadeInUp {
          from {
            opacity: 0;

            transform:
              translateY(15px);
          }

          to {
            opacity: 1;

            transform:
              translateY(0);
          }
        }

        /* -----------------------------------------
           Mobile
        ------------------------------------------ */
        @media (max-width: 480px) {

          .premium-logo-img {
            width: 165px;

            max-width: 85vw;
          }

          .auth-card {
            padding:
              25px 18px;

            margin: 10px;
          }

          .partner-text {
            font-size: 12px;

            padding:
              6px 16px;
          }

        }

      `}</style>

    </div>
  );
}
