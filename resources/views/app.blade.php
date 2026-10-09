<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#1e2124">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: #faf8f3;
            }

            html.dark {
                background-color: #15171a;
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ $metaTitle ?? config('app.name', 'Laravel') }}</title>
        </x-inertia::head>

        @isset($metaDescription)
            <meta name="description" content="{{ $metaDescription }}">
            <link rel="canonical" href="{{ url()->current() }}">
            <meta property="og:type" content="website">
            <meta property="og:site_name" content="{{ config('app.name') }}">
            <meta property="og:title" content="{{ $metaTitle }}">
            <meta property="og:description" content="{{ $metaDescription }}">
            <meta property="og:url" content="{{ url()->current() }}">
            <meta property="og:image" content="{{ asset('apple-touch-icon.png') }}">
            <meta name="twitter:card" content="summary">
        @endisset
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
