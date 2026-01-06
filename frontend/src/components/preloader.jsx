import React from 'react';

export default function Preloader({ fullScreen = true, text = 'LOADING…' }) {
  const Wrapper = ({ children }) =>
    fullScreen ? (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
        {children}
      </div>
    ) : (
      <div className="w-full flex flex-col items-center justify-center py-12">
        {children}
      </div>
    );

  return (
    <Wrapper>
      <img
        className="lg:w-[220px] lg:h-[170px] md:w-[180px] md:h-[140px] w-[140px] h-[110px]"
        src="/arise-logo-login-clear-bg.png"
        alt="Arise Logo"
      />
      {text ? (
        <p className="mt-5 text-[#990100] font-bold md:text-base text-sm tracking-wide">
          {text}
        </p>
      ) : null}
    </Wrapper>
  );
}
