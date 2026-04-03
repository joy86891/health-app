import React, { useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
// @ts-ignore - WebView 在 Web 端不可用，但我们有 Platform 判断
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EChartsProps {
  option: object;
  height?: number;
  width?: number;
}

// 生成 ECharts HTML 内容
function generateEChartsHtml(option: object): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { 
      width: 100%; 
      height: 100%; 
      background: transparent;
      overflow: hidden;
    }
    #chart { 
      width: 100%; 
      height: 100%; 
    }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script>
    var chart = echarts.init(document.getElementById('chart'));
    var option = ${JSON.stringify(option)};
    chart.setOption(option);
    
    window.addEventListener('resize', function() {
      chart.resize();
    });
  </script>
</body>
</html>
`;
}

// Web 端使用 View + 原生 DOM 操作
function EChartsWeb({ option, height = 300, width = SCREEN_WIDTH - 32 }: EChartsProps) {
  // @ts-ignore - React Native Web 中 ref 指向 DOM 元素
  const containerRef = useRef<any>(null);
  const chartInstanceRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const optionJson = useMemo(() => JSON.stringify(option), [option]);

  useEffect(() => {
    const initChart = () => {
      const echartsLib = (window as any).echarts;
      if (!echartsLib || !containerRef.current) {
        return;
      }
      
      // 在 React Native Web 中，ref.current 直接是 DOM 元素
      const domElement = containerRef.current;
      
      // 销毁旧图表
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.dispose();
        } catch (e) {}
      }
      
      // 创建新图表
      try {
        chartInstanceRef.current = echartsLib.init(domElement);
        chartInstanceRef.current.setOption(JSON.parse(optionJson));
        isInitializedRef.current = true;
      } catch (e) {
        console.error('ECharts init error:', e);
      }
    };

    // 检查 ECharts 是否已加载
    if ((window as any).echarts) {
      initChart();
    } else {
      // 动态加载 ECharts
      const existingScript = document.querySelector('script[src*="echarts"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js';
        script.onload = () => {
          // 延迟执行确保 DOM 已准备好
          setTimeout(initChart, 50);
        };
        document.head.appendChild(script);
      }
    }

    return () => {
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.dispose();
        } catch (e) {}
        chartInstanceRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, [optionJson]);

  useEffect(() => {
    const handleResize = () => {
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.resize();
        } catch (e) {}
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <View 
      ref={containerRef}
      style={{ 
        width, 
        height,
        backgroundColor: 'transparent'
      }}
    />
  );
}

// 移动端使用 WebView
function EChartsNative({ option, height = 300, width = SCREEN_WIDTH - 32 }: EChartsProps) {
  const html = useMemo(() => generateEChartsHtml(option), [option]);

  return (
    <View style={[styles.container, { width, height }]}>
      <WebView
        source={{ html }}
        style={styles.webView}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        originWhitelist={['*']}
      />
    </View>
  );
}

// 根据 platform 自动选择
export function ECharts(props: EChartsProps) {
  if (Platform.OS === 'web') {
    return <EChartsWeb {...props} />;
  }
  return <EChartsNative {...props} />;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  webView: {
    backgroundColor: 'transparent',
  },
});
