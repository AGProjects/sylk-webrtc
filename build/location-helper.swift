import Foundation
import CoreLocation

class LocationDelegate: NSObject, CLLocationManagerDelegate {
    let manager = CLLocationManager()

    override init() {
        super.init()
        manager.delegate = self
    }

    func start() {
        let status = manager.authorizationStatus
        if status == .notDetermined {
            manager.requestWhenInUseAuthorization()
        } else {
            handleStatus(status)
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        handleStatus(manager.authorizationStatus)
    }

    func handleStatus(_ status: CLAuthorizationStatus) {
        switch status {
        case .authorizedAlways, .authorized:
            manager.requestLocation()
        case .denied, .restricted:
            printResult(error: "denied")
            exit(1)
        case .notDetermined:
            break // wait for the authorization callback
        @unknown default:
            printResult(error: "unknown authorization status")
            exit(1)
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        printResult(
            lat: loc.coordinate.latitude,
            lon: loc.coordinate.longitude,
            accuracy: loc.horizontalAccuracy,
            timestamp: loc.timestamp.timeIntervalSince1970 * 1000
        )
        exit(0)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        printResult(error: error.localizedDescription)
        exit(1)
    }

    func printResult(lat: Double? = nil, lon: Double? = nil, accuracy: Double? = nil, timestamp: Double? = nil, error: String? = nil) {
        var dict: [String: Any] = [:]
        if let error = error {
            dict["error"] = error
        } else {
            dict["latitude"] = lat
            dict["longitude"] = lon
            dict["accuracy"] = accuracy
            dict["timestamp"] = timestamp
        }
        if let data = try? JSONSerialization.data(withJSONObject: dict),
           let json = String(data: data, encoding: .utf8) {
            print(json)
        }
    }
}

let delegate = LocationDelegate()
delegate.start()
// Keep the run loop alive so the async authorization/location callbacks can fire.
// Hard timeout after 15s in case the user never responds to the prompt.
RunLoop.main.run(until: Date(timeIntervalSinceNow: 15))
